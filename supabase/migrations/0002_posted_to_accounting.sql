-- Widen profiles.role CHECK constraint if one exists to include 'comptable'
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';
    
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(v_conname);
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || quote_ident(v_conname) || ' CHECK (role IN (''admin'', ''user'', ''comptable''))';
  END IF;
END $$;

ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS posted_to_accounting BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS posted_at             TIMESTAMPTZ;
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS posted_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS posted_to_accounting BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS posted_at             TIMESTAMPTZ;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS posted_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sales.posted_to_accounting     IS 'Set by the accountant (or admin) once this invoice has been re-keyed into their own accounting system. Reversible.';
COMMENT ON COLUMN public.sales.posted_at                IS 'When posted_to_accounting was last set to true.';
COMMENT ON COLUMN public.sales.posted_by                IS 'Who last set posted_to_accounting to true.';
COMMENT ON COLUMN public.purchases.posted_to_accounting IS 'Set by the accountant (or admin) once this invoice has been re-keyed into their own accounting system. Reversible.';
COMMENT ON COLUMN public.purchases.posted_at            IS 'When posted_to_accounting was last set to true.';
COMMENT ON COLUMN public.purchases.posted_by            IS 'Who last set posted_to_accounting to true.';

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

  IF v_role IS DISTINCT FROM 'comptable' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only the accountant or an admin can change the posted status';
  END IF;

  UPDATE public.sales SET
    posted_to_accounting = p_posted,
    posted_at = CASE WHEN p_posted THEN now() ELSE NULL END,
    posted_by = CASE WHEN p_posted THEN auth.uid() ELSE NULL END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  RETURN v_row;
END;
$$;

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

  IF v_role IS DISTINCT FROM 'comptable' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only the accountant or an admin can change the posted status';
  END IF;

  UPDATE public.purchases SET
    posted_to_accounting = p_posted,
    posted_at = CASE WHEN p_posted THEN now() ELSE NULL END,
    posted_by = CASE WHEN p_posted THEN auth.uid() ELSE NULL END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_sale_posted(UUID, BOOLEAN)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_posted(UUID, BOOLEAN) TO authenticated;
