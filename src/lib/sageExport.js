import { sanitizeCsvCell } from './utils';
import { journalForKind } from './sageClassification';

// Sage 100's "Libellé écriture" is 35 characters. Longer text is cut by
// buildLibelle so the invoice number (the useful part) always survives.
export const LIBELLE_MAX = 35;

// 'YYYY-MM-DD' -> Sage's 'jjmmaa' (DDMMYY), confirmed live as the default
// "Date de pièce" field format in a real Sage 100 i7 trial account.
export function formatSageDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = String(dateStr).slice(0, 10).split('-');
    if (!y || !m || !d) return '';
    return `${d}${m}${y.slice(-2)}`;
}

// 2-decimal, comma-separator amount ("100,00"). Blank (not "0,00") for a
// missing value — a journal line only ever carries a debit OR a credit.
export function formatSageAmount(n) {
    if (n === null || n === undefined || n === '') return '';
    return Number(n).toFixed(2).replace('.', ',');
}

// A tab or line break inside a text cell would shift every following column
// (or split the record), so flatten them to a space.
const oneLine = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();

// "<supplier/client name> - <invoice number>", cut to LIBELLE_MAX by trimming
// the NAME, never the invoice number. Just the name when there's no number.
export function buildLibelle(receiptNumber, name) {
    const num = oneLine(receiptNumber);
    const nm = oneLine(name);
    if (!num) return nm.slice(0, LIBELLE_MAX).trimEnd();
    if (!nm) return num.slice(0, LIBELLE_MAX);
    const suffix = ` - ${num}`;
    const room = LIBELLE_MAX - suffix.length;
    if (room <= 0) return num.slice(0, LIBELLE_MAX);
    return `${nm.slice(0, room).trimEnd()}${suffix}`;
}

function baseLine(invoice, journal) {
    return {
        journal,
        date: formatSageDate(invoice.transaction_date),
        facture: oneLine(invoice.receipt_number),
        tiers: '',
        libelle: buildLibelle(invoice.receipt_number, invoice.company_name),
    };
}

/**
 * Turn one purchase into its Sage journal lines (HT debit, optional TVA debit,
 * TTC credit) — 2 lines when there's no VAT, 3 otherwise. The three accounts
 * and the journal come from the invoice itself (the comptable classified it);
 * an unclassified invoice yields no lines.
 *
 * @param {object} purchase  a row from `purchases`, with sage_kind / sage_account_*
 * @param {string} tiersCode the supplier's companies.tiers_code (may be blank)
 */
export function purchaseToSageLines(purchase, tiersCode) {
    const journal = journalForKind(purchase.sage_kind);
    if (!journal) return [];
    const base = baseLine(purchase, journal);

    const lines = [
        { ...base, compte: purchase.sage_account_ht, debit: purchase.price_ht, credit: null },
    ];
    if (Number(purchase.tva_20) > 0) {
        lines.push({ ...base, compte: purchase.sage_account_tva, debit: purchase.tva_20, credit: null });
    }
    lines.push({ ...base, compte: purchase.sage_account_ttc, tiers: tiersCode || '', debit: null, credit: purchase.total_ttc });
    return lines;
}

/**
 * The mirror image for a sale (journal VT): the client owes the TTC (debit,
 * carrying the client's tiers code), HT and TVA are credited.
 */
export function saleToSageLines(sale, tiersCode) {
    const journal = journalForKind(sale.sage_kind);
    if (!journal) return [];
    const base = baseLine(sale, journal);

    const lines = [
        { ...base, compte: sale.sage_account_ttc, tiers: tiersCode || '', debit: sale.total_ttc, credit: null },
        { ...base, compte: sale.sage_account_ht, debit: null, credit: sale.price_ht },
    ];
    if (Number(sale.tva_20) > 0) {
        lines.push({ ...base, compte: sale.sage_account_tva, debit: null, credit: sale.tva_20 });
    }
    return lines;
}

// Tab-delimited, no header row, in the exact 8-field order validated live
// in Sage's "Format import/export paramétrable" wizard (N° pièce excluded —
// the comptable confirmed Sage auto-fills it; Code journal comes from the
// file, the template carries no default). Records are joined with
// CRLF, not a bare LF: Sage 100 (legacy Windows software) reads a delimited
// import by record offsets expecting "\r\n", and confirmed live, a bare
// "\n" still gets line 1 right but throws off every line from 2 onward —
// each reported as "Le journal n'existe pas !" even though every line
// carries the same journal code.
export function buildSageFile(rows) {
    return rows
        .map((r) => [
            sanitizeCsvCell(r.journal),
            r.date,
            sanitizeCsvCell(r.compte),
            sanitizeCsvCell(r.facture),
            sanitizeCsvCell(r.tiers),
            sanitizeCsvCell(r.libelle),
            formatSageAmount(r.debit),
            formatSageAmount(r.credit),
        ].join('\t'))
        .join('\r\n');
}

// No UTF-8 BOM here (unlike csv.js's downloadCsv): this file has no header
// row, so a leading BOM lands on the first character of line 1's first
// field, "Code journal", corrupting "ACH" into an unrecognized code.
// Confirmed live: that made Sage 100 reject the whole file with
// "Le journal n'existe pas ! ligne : 1 !".
export function downloadSageFile(filename, rows) {
    const blob = new Blob([buildSageFile(rows)], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
