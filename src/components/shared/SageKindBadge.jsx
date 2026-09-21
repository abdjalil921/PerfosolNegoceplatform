import { Pencil } from 'lucide-react';

const STYLE = {
    ach: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    achdiv: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    immo: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100',
    vt: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100',
};

/**
 * The comptable's per-invoice "Comptes" cell: a button that shows the Sage
 * classification (ACH / ACHDIV / IM / VT + the HT account) and opens the
 * accounts popup — or an "À classer" call to action while the invoice has
 * none. Shown on Purchases / Sales rows to the comptable role only.
 */
export default function SageKindBadge({ t, kind, htAccount, onClick, disabled }) {
    if (!kind) {
        return (
            <button type="button" onClick={onClick} disabled={disabled}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-gray-300 text-gray-500 bg-white hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                <Pencil className="w-3 h-3" />
                {t('sage.toClassify')}
            </button>
        );
    }
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={t('sage.editAccounts')}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors disabled:opacity-40 ${STYLE[kind] || STYLE.achdiv}`}>
            {t(`sage.badge_${kind}`)}
            {htAccount && <span className="font-mono opacity-70">{htAccount}</span>}
        </button>
    );
}
