-- =====================================================================
-- 0004 -- Stale edit triggers and schema update on sales & purchases
-- =====================================================================
-- 1. Ensure the posted_stale column exists on both tables
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS posted_stale BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS posted_stale BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.sales.posted_stale     IS 'Was Comptabilise, then the invoice was edited -- the comptable''s re-keyed entry is now out of date. Cleared by set_sale_posted().';
COMMENT ON COLUMN public.purchases.posted_stale IS 'Was Comptabilise, then the invoice was edited -- the comptable''s re-keyed entry is now out of date. Cleared by set_purchase_posted().';

-- 2. Stale accounting trigger function
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

-- 3. Triggers for sales and purchases
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

-- 4. Reload PostgREST schema cache so the API immediately recognizes posted_stale
NOTIFY pgrst, 'reload schema';
