// Turns the three general-ledger accounts the comptable types on an invoice
// into the Sage journal it belongs to.
//
// Moroccan chart of accounts: the first digit of an account is its "classe" —
// classe 6 = charges (purchases), classe 7 = produits (sales), classe 2 =
// immobilisations. The classe digits and the standard ACH account trio are
// editable in Comptable Settings because the rules change over time, so
// nothing here hardcodes them beyond the fallbacks below.
//
// Journals: ACH  = the standard trio, exactly;
//           ACHDIV = any other classe-6 purchase;
//           IM   = immobilisations (HT in the immobilisations classe);
//           VT   = every sale.

export const SAGE_KINDS = ['ach', 'achdiv', 'immo', 'vt'];

export const JOURNAL_BY_KIND = { ach: 'ACH', achdiv: 'ACHDIV', immo: 'IM', vt: 'VT' };

export const DEFAULT_SAGE_CONFIG = {
    ach: { ht: '611100', tva: '345522', ttc: '441100' },
    classes: { purchase: '6', immo: '2', sale: '7' },
    // Remembered HT -> TVA + TTC combinations the popup auto-fills from. The
    // standard ACH trio ships as the first purchase combination.
    combos: { purchase: [{ ht: '611100', tva: '345522', ttc: '441100' }], sale: [] },
};

const clean = (v) => String(v ?? '').trim();

// The comptable's three Sage settings, read off the settings row with the
// documented fallbacks (a client not yet on migration 0042 still works).
export function getSageConfig(profile) {
    const ach = profile?.sage_purchase_accounts || {};
    return {
        ach: {
            ht: clean(ach.ht_default) || DEFAULT_SAGE_CONFIG.ach.ht,
            tva: clean(ach.tva) || DEFAULT_SAGE_CONFIG.ach.tva,
            ttc: clean(ach.tiers_root) || DEFAULT_SAGE_CONFIG.ach.ttc,
        },
        classes: { ...DEFAULT_SAGE_CONFIG.classes, ...(profile?.sage_classes || {}) },
        combos: {
            purchase: Array.isArray(profile?.sage_combos?.purchase) ? cleanCombos(profile.sage_combos.purchase) : DEFAULT_SAGE_CONFIG.combos.purchase,
            sale: Array.isArray(profile?.sage_combos?.sale) ? cleanCombos(profile.sage_combos.sale) : DEFAULT_SAGE_CONFIG.combos.sale,
        },
    };
}

// ─── Remembered account combinations ────────────────────────────────
// A combination is one HT account with the TVA and TTC accounts that go with
// it. Typing the HT in the comptable's popup fills the other two; saving an
// invoice with a combination not yet in the list adds it (newest first).
// Editable in Comptable Settings.

const sameCombo = (a, b) => a.ht === b.ht && a.tva === b.tva && a.ttc === b.ttc;

// Trim every field, drop rows with no HT, drop exact duplicates (keeps order).
export function cleanCombos(list) {
    const out = [];
    for (const c of list || []) {
        const row = { ht: clean(c?.ht), tva: clean(c?.tva), ttc: clean(c?.ttc) };
        if (!row.ht) continue;
        if (!out.some(o => sameCombo(o, row))) out.push(row);
    }
    return out;
}

// The combination to auto-fill for an HT account (first = newest), or null.
export function findCombo(list, ht) {
    const key = clean(ht);
    if (!key) return null;
    return (list || []).find(c => clean(c.ht) === key) || null;
}

// Add a combination in front of the list; returns the SAME array when it is
// already there (so callers can skip a pointless save) or is incomplete.
export function addCombo(list, combo) {
    const row = { ht: clean(combo?.ht), tva: clean(combo?.tva), ttc: clean(combo?.ttc) };
    if (!row.ht || !row.tva || !row.ttc) return list;
    if ((list || []).some(c => sameCombo({ ht: clean(c.ht), tva: clean(c.tva), ttc: clean(c.ttc) }, row))) return list;
    return [row, ...(list || [])];
}

// Account numbers offered by the popup's autocomplete, per field.
export function comboOptions(list) {
    const uniq = (key) => [...new Set((list || []).map(c => clean(c[key])).filter(Boolean))].sort();
    return { ht: uniq('ht'), tva: uniq('tva'), ttc: uniq('ttc') };
}

export function journalForKind(kind) {
    return JOURNAL_BY_KIND[kind] || '';
}

/**
 * @param {{ht: string, tva: string, ttc: string}} accounts
 * @param {object} cfg          getSageConfig() result
 * @param {{hasVat?: boolean}}  opts  hasVat=false: a blank TVA account still
 *   counts as the standard trio (an invoice with no VAT has no TVA line).
 * @returns {'ach'|'immo'|'achdiv'}
 */
export function classifyPurchase(accounts, cfg, { hasVat = true } = {}) {
    const ht = clean(accounts.ht);
    const tva = clean(accounts.tva);
    const ttc = clean(accounts.ttc);

    const tvaMatches = tva === cfg.ach.tva || (!hasVat && tva === '');
    if (ht === cfg.ach.ht && ttc === cfg.ach.ttc && tvaMatches) return 'ach';

    const immo = clean(cfg.classes.immo);
    if (immo && ht.startsWith(immo)) return 'immo';

    return 'achdiv';
}

export function classifySale() {
    return 'vt';
}

/**
 * Required fields are the only hard errors: a blank general account makes
 * Sage drop the line silently (proven live). Everything else — an HT account
 * outside the expected classe, a non-numeric value — is only a warning,
 * because the accounting rules change and the comptable must never be blocked.
 *
 * @param {'purchase'|'sale'} ns
 * @returns {{ errors: string[], warnings: Array<{code: string, [k: string]: any}> }}
 */
export function validateAccounts(ns, accounts, cfg, { hasVat = true } = {}) {
    const ht = clean(accounts.ht);
    const tva = clean(accounts.tva);
    const ttc = clean(accounts.ttc);

    const errors = [];
    if (!ht) errors.push('ht');
    if (!ttc) errors.push('ttc');
    if (hasVat && !tva) errors.push('tva');

    const warnings = [];
    if (ht) {
        const expected = ns === 'sale'
            ? [cfg.classes.sale]
            : [cfg.classes.purchase, cfg.classes.immo];
        const known = expected.map(clean).filter(Boolean);
        if (known.length && !known.some(c => ht.startsWith(c))) {
            warnings.push({ code: 'htClasse', expected: known.join(' / ') });
        }
    }
    for (const [field, value] of [['ht', ht], ['tva', tva], ['ttc', ttc]]) {
        if (value && !/^\d+$/.test(value)) warnings.push({ code: 'nonNumeric', field });
    }
    return { errors, warnings };
}

// Can this invoice be exported? Classified, HT + TTC accounts present, and a
// TVA account whenever there is VAT to post — a blank general account makes
// Sage drop the line silently, so such invoices must never reach the file.
export function isSageReady(inv) {
    if (!inv?.sage_kind) return false;
    if (!clean(inv.sage_account_ht) || !clean(inv.sage_account_ttc)) return false;
    if (Number(inv.tva_20) > 0 && !clean(inv.sage_account_tva)) return false;
    return true;
}
