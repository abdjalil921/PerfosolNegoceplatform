import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, Building2, Download, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import HScrollWrapper from '../../components/ui/HScrollWrapper';
import PostedBadge from '../../components/shared/PostedBadge';
import { usePurchases } from '../../hooks/usePurchases';
import { useCompanies } from '../../hooks/useCompanies';
import { fmtMoney } from '../../lib/format';
import { fmtDate } from '../../lib/utils';
import { isSageReady } from '../../lib/sageClassification';
import { purchaseToSageLines, downloadSageFile } from '../../lib/sageExport';
import { buildExportSet, lastMonthKey } from '../../lib/sageExportSet';
import SageSetupGuideModal from './SageSetupGuideModal';

// One page component serves the three purchase journals — the kind picks which
// of the (already loaded) purchases it shows. Nothing is copied: a purchase
// appears on exactly one of these pages, according to the accounts the
// comptable typed on it in Purchases.
const META = {
    ach: { navKey: 'nav.sageAchat', icon: BookOpen, journal: 'ACH', file: 'ach' },
    achdiv: { navKey: 'nav.sageAchatDivers', icon: Layers, journal: 'ACHDIV', file: 'achdiv' },
    immo: { navKey: 'nav.sageImmo', icon: Building2, journal: 'IM', file: 'immobilisations' },
};

function StatusBadge({ t, purchase }) {
    if (purchase.posted_to_accounting) return <PostedBadge t={t} ns="purchases" posted stale={false} />;
    if (isSageReady(purchase)) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-100">
                <CheckCircle2 className="w-3 h-3" />{t('sage.statusReady')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-100">
            <AlertTriangle className="w-3 h-3" />{t('sage.statusIncomplete')}
        </span>
    );
}

export default function SageJournal({ kind }) {
    const { t } = useTranslation();
    const meta = META[kind];
    const Icon = meta.icon;
    const { purchases, loading } = usePurchases();
    const { companies } = useCompanies();

    const [month, setMonth] = useState(lastMonthKey());
    const [showGuide, setShowGuide] = useState(false);

    const tiersFor = (p) => companies.find(c => c.id === p.company_id)?.tiers_code || '';

    const set = useMemo(() => buildExportSet(purchases, {
        month, kinds: [kind], toLines: purchaseToSageLines,
        tiersFor: (p) => companies.find(c => c.id === p.company_id)?.tiers_code || '',
    }), [purchases, companies, month, kind]);

    const handleExport = () => downloadSageFile(`journal_${meta.file}_${month}.txt`, set.lines);

    const thCls = 'px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide';

    return (
        <div className="space-y-5">
            {showGuide && <SageSetupGuideModal onClose={() => setShowGuide(false)} />}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                        {t(meta.navKey)}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('sage.pageSubtitle', { journal: meta.journal })}</p>
                </div>
                <button onClick={handleExport} disabled={set.ready.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4" />
                    {t('sage.exportButton')}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('sage.month')}</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
                    </div>
                    <button type="button" onClick={() => setShowGuide(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {t('purchases.sageGuideLink')}
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-[11px] text-gray-400">{t('sage.invoicesToExport')}</p>
                        <p className="font-semibold text-gray-800">{set.ready.length}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-[11px] text-gray-400">{t('purchases.priceHT')}</p>
                        <p className="font-mono font-medium text-gray-800">{fmtMoney(set.totals.ht)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-[11px] text-gray-400">{t('purchases.tva20')}</p>
                        <p className="font-mono font-medium text-gray-800">{fmtMoney(set.totals.tva)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-[11px] text-gray-400">Total TTC</p>
                        <p className="font-mono font-medium text-gray-800">{fmtMoney(set.totals.ttc)}</p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 ${set.balanced ? 'border-emerald-100 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                        <p className="text-[11px] text-gray-500">{t('sage.balance')}</p>
                        <p className={`font-medium text-xs ${set.balanced ? 'text-emerald-700' : 'text-red-600'}`}>
                            {set.balanced ? t('sage.balanced') : t('sage.unbalanced')}
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5 text-xs">
                    {set.postedCount > 0 && (
                        <p className="text-emerald-600">{t('sage.excludedPosted', { count: set.postedCount })}</p>
                    )}
                    {set.incompleteCount > 0 && (
                        <p className="flex items-center gap-1.5 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />{t('sage.excludedIncomplete', { count: set.incompleteCount })}</p>
                    )}
                    {set.missingTiersCount > 0 && (
                        <p className="flex items-center gap-1.5 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />{t('sage.missingTiers', { count: set.missingTiersCount })}{' '}<Link to="/comptable-settings" className="underline underline-offset-2">{t('sage.setTiers')}</Link></p>
                    )}
                    {set.unclassifiedCount > 0 && (
                        <p className="text-gray-500">
                            {t('sage.unclassifiedInMonth', { count: set.unclassifiedCount })}{' '}
                            <Link to="/purchases" className="text-emerald-700 underline underline-offset-2">{t('sage.goClassify')}</Link>
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-10">{t('common.loading')}</p>
                ) : set.rows.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">{t('sage.emptyJournal')}</p>
                ) : (
                    <HScrollWrapper>
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className={`${thCls} text-left`}>{t('purchases.transactionDate')}</th>
                                    <th className={`${thCls} text-left`}>{t('purchases.receiptNumber')}</th>
                                    <th className={`${thCls} text-left`}>{t('purchases.company')}</th>
                                    <th className={`${thCls} text-right`}>{t('purchases.priceHT')}</th>
                                    <th className={`${thCls} text-right`}>{t('purchases.tva20')}</th>
                                    <th className={`${thCls} text-right`}>Total TTC</th>
                                    <th className={`${thCls} text-left`}>{t('sage.columnAccounts')}</th>
                                    <th className={`${thCls} text-left`}>{t('sage.tiersColumn')}</th>
                                    <th className={`${thCls} text-center`}>{t('sage.statusColumn')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {set.rows.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 border-b border-gray-100">
                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(p.transaction_date)}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{p.receipt_number || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{p.company_name || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{fmtMoney(p.price_ht)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{fmtMoney(p.tva_20)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-medium text-gray-800 whitespace-nowrap">{fmtMoney(p.total_ttc)}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                                            {[p.sage_account_ht, p.sage_account_tva, p.sage_account_ttc].map(a => a || '—').join(' · ')}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                                            {tiersFor(p) || <span className="text-amber-600">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap"><StatusBadge t={t} purchase={p} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </HScrollWrapper>
                )}
            </div>
        </div>
    );
}
