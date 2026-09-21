-- =====================================================================
-- 0005 -- Comptable: per-invoice Sage accounts for PURCHASES, tiers codes
-- =====================================================================
-- The comptable classifies every purchase invoice himself: on each row he
-- types the three general-ledger accounts (HT, TVA, TTC/tiers). The Sage
-- journal is derived from them in the frontend and snapshotted here as
-- `sage_kind`:
--
--   'ach'    exactly the standard trio (settings.sage_purchase_accounts) -> journal ACH
--   'achdiv' any other classe-6 purchase                                  -> journal ACHDIV
--   'immo'   classe-2 (immobilisations)                                   -> journal IM
--
-- sage_kind NULL = not classified yet (never exported).
--
-- SALES are deliberately NOT part of this migration: sales carry a retenue de
-- garantie, so their accounting entry differs and is handled in a later
-- migration once the comptable has confirmed how he books it.
--
-- Also here:
--   * companies.tiers_code -- the supplier's "N° tiers" in Sage (e.g. FR001).
--   * settings.sage_purchase_accounts / sage_classes / sage_combos -- the
--     standard ACH trio, the "classe" digits (6 / 2 / 7) and the remembered
--     HT -> TVA + TTC combinations the classification popup auto-fills from.
--   * set_purchases_sage_accounts -- comptable-only write path (array based:
--     one invoice or a bulk selection).
--   * set_party_tiers_code -- comptable-only write path for a supplier's
--     tiers code (the comptable is read-only on suppliers).
--   * set_sage_settings -- comptable-only write path for the three Sage
--     settings columns (the settings table is admin-write-only).
--
-- INTERACTION WITH 0004 (handle_stale_accounting_on_edit): that BEFORE UPDATE
-- trigger flags any edited posted invoice as stale. set_purchases_sage_accounts
-- therefore (a) only touches rows whose accounts actually change, so re-saving
-- identical accounts never flags anything, and (b) when it does change a posted
-- invoice, un-posts it and marks it stale itself -- the same outcome as an
-- edit: what the comptable keyed into Sage no longer matches.
--
-- HOW TO APPLY (manual): Supabase Dashboard -> SQL Editor -> paste -> Run.
-- Idempotent. Requires 0002-0004 (posted_to_accounting, posted_stale, comptable role).
-- =====================================================================

-- -- Columns ----------------------------------------------------------
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS sage_account_ht  TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS sage_account_tva TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS sage_account_ttc TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS sage_kind        TEXT;

ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_sage_kind_check;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_sage_kind_check
  CHECK (sage_kind IS NULL OR sage_kind IN ('ach', 'achdiv', 'immo'));

COMMENT ON COLUMN public.purchases.sage_account_ht  IS 'Sage general-ledger account for the HT line, entered by the comptable (classe 6 charges / classe 2 immobilisations).';
COMMENT ON COLUMN public.purchases.sage_account_tva IS 'Sage general-ledger account for the TVA line (may be blank when the invoice has no VAT).';
COMMENT ON COLUMN public.purchases.sage_account_ttc IS 'Sage collective/tiers account for the TTC line (paired with the supplier tiers_code).';
COMMENT ON COLUMN public.purchases.sage_kind        IS 'Classification snapshot taken when the comptable saved the accounts: ach | achdiv | immo. NULL = not classified yet.';

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tiers_code TEXT;
COMMENT ON COLUMN public.companies.tiers_code IS 'Supplier''s accounting "N° tiers" code in the accountant''s Sage 100 chart of accounts (e.g. FR001). Written on the TTC line of the Sage export.';

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS sage_purchase_accounts JSONB NOT NULL
  DEFAULT '{"ht_default": "611100", "tva": "345522", "tiers_root": "441100"}';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS sage_classes JSONB NOT NULL
  DEFAULT '{"purchase": "6", "immo": "2", "sale": "7"}';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS sage_combos JSONB NOT NULL
  DEFAULT '{"purchase": [{"ht": "611100", "tva": "345522", "ttc": "441100"}], "sale": []}';

COMMENT ON COLUMN public.settings.sage_purchase_accounts IS 'The standard ACH account trio: an invoice with exactly these three accounts goes to journal ACH. ht_default = HT, tva = TVA deductible, tiers_root = Fournisseurs (TTC).';
COMMENT ON COLUMN public.settings.sage_classes IS 'First digit ("classe") of the HT account per kind of invoice: purchase (classe 6, charges), immo (classe 2, immobilisations), sale (classe 7, produits). Used for warnings and for detecting immobilisations; never blocks a save.';
COMMENT ON COLUMN public.settings.sage_combos IS 'Remembered account combinations { purchase: [{ht,tva,ttc}], sale: [...] }. Typing an HT account in the comptable''s popup fills TVA and TTC from the matching combination (newest first); a new combination is added automatically when an invoice is saved with it. Editable in Comptable Settings.';

-- -- Write path: purchases ---------------------------------------------
CREATE OR REPLACE FUNCTION public.set_purchases_sage_accounts(
  p_ids UUID[], p_ht TEXT, p_tva TEXT, p_ttc TEXT, p_kind TEXT
)
RETURNS SETOF public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_ht   TEXT := NULLIF(TRIM(p_ht), '');
  v_tva  TEXT := NULLIF(TRIM(p_tva), '');
  v_ttc  TEXT := NULLIF(TRIM(p_ttc), '');
  v_kind TEXT := NULLIF(TRIM(p_kind), '');
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'comptable' THEN
    RAISE EXCEPTION 'Only the accountant can set the Sage accounts';
  END IF;

  IF v_kind IS NOT NULL AND v_kind NOT IN ('ach', 'achdiv', 'immo') THEN
    RAISE EXCEPTION 'Invalid classification';
  END IF;
  -- Either clear everything, or HT + TTC + a classification must all be there
  -- (a blank general account silently drops the line on the Sage import).
  IF NOT (v_ht IS NULL AND v_tva IS NULL AND v_ttc IS NULL AND v_kind IS NULL)
     AND (v_ht IS NULL OR v_ttc IS NULL OR v_kind IS NULL) THEN
    RAISE EXCEPTION 'HT and TTC accounts are required';
  END IF;

  RETURN QUERY
  WITH u AS (
    UPDATE public.purchases p SET
      sage_account_ht  = v_ht,
      sage_account_tva = v_tva,
      sage_account_ttc = v_ttc,
      sage_kind        = v_kind,
      -- a posted invoice whose accounts change is no longer what was keyed in
      posted_to_accounting = CASE WHEN p.posted_to_accounting THEN FALSE ELSE p.posted_to_accounting END,
      posted_at            = CASE WHEN p.posted_to_accounting THEN NULL  ELSE p.posted_at END,
      posted_by            = CASE WHEN p.posted_to_accounting THEN NULL  ELSE p.posted_by END,
      posted_stale         = CASE WHEN p.posted_to_accounting THEN TRUE  ELSE p.posted_stale END
    WHERE p.id = ANY(p_ids)
      -- only rows that really change (see the note about 0004 above)
      AND ROW(p.sage_account_ht, p.sage_account_tva, p.sage_account_ttc, p.sage_kind)
          IS DISTINCT FROM ROW(v_ht, v_tva, v_ttc, v_kind)
    RETURNING p.*
  )
  SELECT * FROM u;
END $$;

-- -- Write path: a supplier's Sage tiers code (comptable only) ----------
CREATE OR REPLACE FUNCTION public.set_party_tiers_code(p_table TEXT, p_id UUID, p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_code TEXT := NULLIF(TRIM(p_code), '');
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'comptable' THEN
    RAISE EXCEPTION 'Only the accountant can set a tiers code';
  END IF;

  IF p_table = 'companies' THEN
    UPDATE public.companies SET tiers_code = v_code WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unknown table';   -- clients arrive with the sales migration
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  RETURN v_code;
END $$;

-- -- Write path: the three Sage settings (comptable only) ---------------
CREATE OR REPLACE FUNCTION public.set_sage_settings(p_patch JSONB)
RETURNS public.settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_key  TEXT;
  v_row  public.settings;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'comptable' THEN
    RAISE EXCEPTION 'Only the accountant can change the Sage settings';
  END IF;

  FOREACH v_key IN ARRAY ARRAY['sage_purchase_accounts', 'sage_classes', 'sage_combos'] LOOP
    IF p_patch ? v_key AND jsonb_typeof(p_patch -> v_key) <> 'object' THEN
      RAISE EXCEPTION '% must be an object', v_key;
    END IF;
  END LOOP;

  UPDATE public.settings SET
    sage_purchase_accounts = COALESCE(p_patch -> 'sage_purchase_accounts', sage_purchase_accounts),
    sage_classes           = COALESCE(p_patch -> 'sage_classes', sage_classes),
    sage_combos            = COALESCE(p_patch -> 'sage_combos', sage_combos)
  WHERE id = 1
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Settings row not found';
  END IF;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.set_purchases_sage_accounts(UUID[], TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_party_tiers_code(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_sage_settings(JSONB) TO authenticated;

-- Reload the PostgREST schema cache so the new columns / functions are visible at once.
NOTIFY pgrst, 'reload schema';
