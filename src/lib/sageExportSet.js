import { isSageReady } from './sageClassification';

// Default month for an export: last month — the books are normally closed for
// the month before.
export function lastMonthKey(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const cents = (n) => Math.round((Number(n) || 0) * 100);

/**
 * Work out what one Sage export contains, for one month and one kind of
 * journal (or the single sales journal).
 *
 * Left out of the file, and reported instead so nothing goes missing quietly:
 *   - already Comptabilisé invoices (Sage has no duplicate detection on
 *     import, so re-sending them would post every one twice);
 *   - invoices classified but no longer exportable, e.g. a VAT amount was
 *     added after classification and there is no TVA account (a blank general
 *     account makes Sage drop the line silently);
 *   - `unclassified`: the month's invoices with no Sage accounts at all, so
 *     the comptable knows there is still work left elsewhere.
 *
 * @param {object[]} invoices  purchases or sales rows
 * @param {object} o
 * @param {string} o.month     'YYYY-MM'
 * @param {string[]} o.kinds   sage_kind values this export covers
 * @param {(invoice, tiersCode: string) => object[]} o.toLines  purchaseToSageLines / saleToSageLines
 * @param {(invoice) => string} o.tiersFor  the supplier's / client's tiers code
 */
export function buildExportSet(invoices, { month, kinds, toLines, tiersFor }) {
    const inMonth = invoices.filter(i => !i.deleted_at && String(i.transaction_date || '').slice(0, 7) === month);
    const ofKind = inMonth.filter(i => kinds.includes(i.sage_kind));

    const byDateThenNumber = (a, b) => String(a.transaction_date || '').localeCompare(String(b.transaction_date || ''))
        || String(a.receipt_number || '').localeCompare(String(b.receipt_number || ''));

    const posted = ofKind.filter(i => i.posted_to_accounting);
    const pending = ofKind.filter(i => !i.posted_to_accounting);
    const ready = pending.filter(isSageReady).sort(byDateThenNumber);

    const lines = ready.flatMap(i => toLines(i, tiersFor(i)));

    const totals = ready.reduce((acc, i) => ({
        ht: acc.ht + (Number(i.price_ht) || 0),
        tva: acc.tva + (Number(i.tva_20) || 0),
        ttc: acc.ttc + (Number(i.total_ttc) || 0),
    }), { ht: 0, tva: 0, ttc: 0 });

    const debit = lines.reduce((s, l) => s + cents(l.debit), 0) / 100;
    const credit = lines.reduce((s, l) => s + cents(l.credit), 0) / 100;

    const missingParties = new Set();
    for (const i of ready) if (!tiersFor(i)) missingParties.add(i.company_id || i.company_name);

    return {
        rows: [...ofKind].sort(byDateThenNumber), // everything of this kind in the month, for the on-screen table
        ready,
        lines,
        totals,
        debit,
        credit,
        balanced: cents(debit) === cents(credit),
        postedCount: posted.length,
        incompleteCount: pending.length - ready.length,
        unclassifiedCount: inMonth.filter(i => !i.sage_kind).length,
        missingTiersCount: missingParties.size,
    };
}
