-- =====================================================================
-- 0003 -- "Comptabilise" (0002) refinements: comptable-only toggle,
-- auto-reset on edit
-- =====================================================================
-- Two changes to the posted_to_accounting tracker (0002):
--
-- 1. Only the comptable role may flip the status now -- an admin can still
--    SEE it (unchanged in the UI), but toggling it was really the
--    comptable's own record of what they've re-keyed, not something an
--    admin should be marking on their behalf.
--
-- 2. If a sale/purchase that's already Comptabilise gets edited afterwards
--    (amounts, dates, lines -- anything, via update_sale/update_purchase),
--    the edit silently invalidates whatever the comptable already re-keyed.
--    Previously nothing showed that; now the row automatically flips back
--    to "not posted" AND gets a new posted_stale flag, so the UI can show
--    a distinct "Edited -- needs re-entry" state instead of looking exactly
--    like an invoice nobody has touched yet. Re-marking it (in either
--    direction) via set_sale_posted/set_purchase_posted clears the flag,
--    since that's the comptable's own explicit, current decision.
--
-- HOW TO APPLY (manual): Supabase Dashboard -> SQL Editor -> paste -> Run.
-- Idempotent.
-- =====================================================================

ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS posted_stale BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS posted_stale BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.sales.posted_stale     IS 'Was Comptabilise, then the invoice was edited -- the comptable''s re-keyed entry is now out of date. Cleared by set_sale_posted().';
COMMENT ON COLUMN public.purchases.posted_stale IS 'Was Comptabilise, then the invoice was edited -- the comptable''s re-keyed entry is now out of date. Cleared by set_purchase_posted().';

-- Toggle RPCs: comptable only (admin keeps read-only visibility)
CREATE OR REPLACE FUNCTION public.set_sale_posted(p_id UUID, p_posted BOOLEAN)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_row  public.sales;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'comptable' THEN
    RAISE EXCEPTION 'Only the accountant can change the posted status';
  END IF;

  UPDATE public.sales SET
    posted_to_accounting = p_posted,
    posted_at = CASE WHEN p_posted THEN now() ELSE NULL END,
    posted_by = CASE WHEN p_posted THEN auth.uid() ELSE NULL END,
    posted_stale = FALSE
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.set_purchase_posted(p_id UUID, p_posted BOOLEAN)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_row  public.purchases;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'comptable' THEN
    RAISE EXCEPTION 'Only the accountant can change the posted status';
  END IF;

  UPDATE public.purchases SET
    posted_to_accounting = p_posted,
    posted_at = CASE WHEN p_posted THEN now() ELSE NULL END,
    posted_by = CASE WHEN p_posted THEN auth.uid() ELSE NULL END,
    posted_stale = FALSE
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
  RETURN v_row;
END $$;

-- update_sale / update_purchase: reset + flag "edited since posted"
CREATE OR REPLACE FUNCTION public.update_sale(p_id UUID, p_sale JSONB, p_user UUID DEFAULT NULL)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_receipt     TEXT;
  v_sale        public.sales;
  v_was_posted  BOOLEAN;
BEGIN
  PERFORM public._assert_can_write_ledger();

  v_receipt := NULLIF(TRIM(p_sale->>'receipt_number'), '');
  IF v_receipt IS NULL THEN
    SELECT receipt_number INTO v_receipt FROM public.sales WHERE id = p_id;
    v_receipt := COALESCE(v_receipt, public.next_document_number('sales'));
  END IF;

  SELECT posted_to_accounting INTO v_was_posted FROM public.sales WHERE id = p_id;

  PERFORM public._reverse_stock_txs(p_id, 'sale');

  UPDATE public.sales SET
    transaction_date = (p_sale->>'transaction_date')::date,
    company_id       = NULLIF(p_sale->>'company_id','')::uuid,
    company_name     = p_sale->>'company_name',
    company_address  = p_sale->>'company_address',
    if_tax           = p_sale->>'if_tax',
    ice              = p_sale->>'ice',
    receipt_number   = v_receipt,
    bc_number        = p_sale->>'bc_number',
    bl_number        = p_sale->>'bl_number',
    item_sold        = p_sale->>'item_sold',
    price_ht         = (p_sale->>'price_ht')::numeric,
    tva_20           = NULLIF(p_sale->>'tva_20','')::numeric,
    total_ttc        = NULLIF(p_sale->>'total_ttc','')::numeric,
    payment_date     = NULLIF(p_sale->>'payment_date','')::date,
    due_date         = NULLIF(p_sale->>'due_date','')::date,
    tva_rate         = COALESCE(NULLIF(p_sale->>'tva_rate','')::numeric, 0.20),
    payment_method   = NULLIF(p_sale->>'payment_method',''),
    quantity         = NULLIF(p_sale->>'quantity','')::numeric,
    item_id          = NULLIF(p_sale->>'item_id','')::uuid,
    include_tva      = COALESCE((p_sale->>'include_tva')::boolean, TRUE),
    line_items       = COALESCE(p_sale->'line_items', '[]'::jsonb),
    posted_to_accounting = CASE WHEN v_was_posted THEN FALSE ELSE posted_to_accounting END,
    posted_at            = CASE WHEN v_was_posted THEN NULL  ELSE posted_at END,
    posted_by            = CASE WHEN v_was_posted THEN NULL  ELSE posted_by END,
    posted_stale         = CASE WHEN v_was_posted THEN TRUE  ELSE posted_stale END
  WHERE id = p_id
  RETURNING * INTO v_sale;

  PERFORM public._apply_stock_txs(p_id, 'sale', 'outgoing',
    COALESCE(p_sale->'line_items', '[]'::jsonb), p_user,
    'Vente #' || v_receipt || ' (auto)', FALSE);

  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_purchase(p_id UUID, p_purchase JSONB, p_user UUID DEFAULT NULL)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_purchase    public.purchases;
  v_note        TEXT;
  v_lines       JSONB;
  v_was_posted  BOOLEAN;
BEGIN
  PERFORM public._assert_can_write_ledger();

  v_note := 'Achat' ||
            CASE WHEN NULLIF(TRIM(p_purchase->>'receipt_number'),'') IS NOT NULL
                 THEN ' #' || (p_purchase->>'receipt_number') ELSE '' END ||
            ' (auto)';

  SELECT posted_to_accounting INTO v_was_posted FROM public.purchases WHERE id = p_id;

  PERFORM public._reverse_stock_txs(p_id, 'purchase');

  UPDATE public.purchases SET
    transaction_date = (p_purchase->>'transaction_date')::date,
    company_id       = NULLIF(p_purchase->>'company_id','')::uuid,
    company_name     = p_purchase->>'company_name',
    if_tax           = p_purchase->>'if_tax',
    ice              = p_purchase->>'ice',
    receipt_number   = NULLIF(p_purchase->>'receipt_number',''),
    item_purchased   = p_purchase->>'item_purchased',
    price_ht         = (p_purchase->>'price_ht')::numeric,
    tva_20           = NULLIF(p_purchase->>'tva_20','')::numeric,
    total_ttc        = NULLIF(p_purchase->>'total_ttc','')::numeric,
    payment_date     = NULLIF(p_purchase->>'payment_date','')::date,
    tva_rate         = COALESCE(NULLIF(p_purchase->>'tva_rate','')::numeric, 0.20),
    payment_method   = NULLIF(p_purchase->>'payment_method',''),
    quantity         = NULLIF(p_purchase->>'quantity','')::numeric,
    item_id          = NULLIF(p_purchase->>'item_id','')::uuid,
    include_tva      = COALESCE((p_purchase->>'include_tva')::boolean, TRUE),
    posted_to_accounting = CASE WHEN v_was_posted THEN FALSE ELSE posted_to_accounting END,
    posted_at            = CASE WHEN v_was_posted THEN NULL  ELSE posted_at END,
    posted_by            = CASE WHEN v_was_posted THEN NULL  ELSE posted_by END,
    posted_stale         = CASE WHEN v_was_posted THEN TRUE  ELSE posted_stale END
  WHERE id = p_id
  RETURNING * INTO v_purchase;

  v_lines := public._apply_stock_txs(p_id, 'purchase', 'incoming',
    COALESCE(p_purchase->'line_items', '[]'::jsonb), p_user, v_note, TRUE);

  UPDATE public.purchases SET line_items = v_lines WHERE id = p_id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_sale_posted(UUID, BOOLEAN)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_posted(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sale(UUID, JSONB, UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase(UUID, JSONB, UUID) TO authenticated;

-- =====================================================================
-- Automatic Triggers for Direct Table Updates
-- =====================================================================
-- In this application, frontend hooks (useSales.js / usePurchases.js) perform
-- direct table updates (e.g. supabase.from('sales').update(...)) instead of
-- calling update_sale() / update_purchase() RPC.
-- The triggers below guarantee that any update to a posted sale or purchase
-- automatically resets posted_to_accounting and sets posted_stale = true,
-- even if an update payload does not include accounting columns.
-- When set_sale_posted() / set_purchase_posted() explicitly sets
-- posted_to_accounting = FALSE (undo), NEW.posted_to_accounting IS NOT FALSE
-- is false, so the trigger does not set posted_stale.

CREATE OR REPLACE FUNCTION public.handle_stale_accounting_on_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.posted_to_accounting = TRUE AND NEW.posted_to_accounting IS NOT FALSE THEN
    NEW.posted_to_accounting := FALSE;
    NEW.posted_at            := NULL;
    NEW.posted_by            := NULL;
    NEW.posted_stale         := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sales_stale_edit ON public.sales;
CREATE TRIGGER tr_sales_stale_edit
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stale_accounting_on_edit();

DROP TRIGGER IF EXISTS tr_purchases_stale_edit ON public.purchases;
CREATE TRIGGER tr_purchases_stale_edit
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stale_accounting_on_edit();

-- Reload PostgREST schema cache so the API immediately recognizes posted_stale
NOTIFY pgrst, 'reload schema';


