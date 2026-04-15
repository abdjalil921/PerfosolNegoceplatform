import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from 'react-i18next';
import { Tag, Search, TrendingUp, TrendingDown, Printer } from 'lucide-react';

export default function PricingPage() {
    const { t } = useTranslation();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';
    const { items, loading } = useItems();
    const [search, setSearch] = useState('');

    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatPrice = (val) => {
        if (val == null || val === '') return '—';
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getMargin = (item) => {
        if (item.selling_price == null || item.buying_price == null) return null;
        return Number(item.selling_price) - Number(item.buying_price);
    };

    const handlePrint = () => {
        const rows = filtered.map(item => {
            const margin = getMargin(item);
            const marginStr = margin == null ? '—' : (margin >= 0 ? '+' : '') + formatPrice(margin);
            return `<tr>
                <td>${item.name.replace(/</g, '&lt;')}</td>
                <td>${(item.category || '—').replace(/</g, '&lt;')}</td>
                <td>${item.unit || '—'}</td>
                <td style="text-align:right;font-family:monospace">${formatPrice(item.buying_price)}</td>
                <td style="text-align:right;font-family:monospace">${formatPrice(item.selling_price)}</td>
                <td style="text-align:right;font-family:monospace;color:${margin == null ? '#666' : margin >= 0 ? '#15803d' : '#dc2626'}">${marginStr}</td>
            </tr>`;
        }).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Prix – ${displayName}</title>
<style>
  @page{size:A4 portrait;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #7c3aed}
  .header h1{font-size:18px;font-weight:700;color:#7c3aed}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#f5f3ff}th{padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#5b21b6;border-bottom:2px solid #ddd6fe;text-align:left}
  td{padding:6px 10px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafaf9}
  .footer{margin-top:12px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('pricing.title')} – ${displayName}</h1>
    <p>${filtered.length} article(s)</p>
  </div>
  <table>
    <thead><tr>
      <th>${t('items.name')}</th><th>${t('items.category')}</th><th>${t('items.unit')}</th>
      <th style="text-align:right">${t('pricing.buyingPrice')}</th>
      <th style="text-align:right">${t('pricing.sellingPrice')}</th>
      <th style="text-align:right">${t('pricing.margin')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">${displayName} · ${t('pricing.title')} · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html); win.document.close();
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <Tag className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
                    {t('pricing.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">{t('pricing.subtitle')}</p>
            </div>

            {/* Search + Print */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('pricing.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                {filtered.length > 0 && (
                    <button onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-700 border border-violet-300 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap">
                        <Printer className="w-3.5 h-3.5" />
                        Print
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">{t('common.loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">{t('items.noItems')}</div>
            ) : (
                <>
                    {/* ─── Mobile cards (< sm) ─── */}
                    <div className="sm:hidden space-y-2">
                        {filtered.map(item => {
                            const margin = getMargin(item);
                            return (
                                <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                            {item.category && (
                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{item.category}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{item.unit}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-gray-400 mb-0.5">{t('pricing.buyingPrice')}</p>
                                            <p className="text-sm font-mono font-medium text-gray-700">{formatPrice(item.buying_price)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-0.5">{t('pricing.sellingPrice')}</p>
                                            <p className="text-sm font-mono font-medium text-gray-700">{formatPrice(item.selling_price)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-0.5">{t('pricing.margin')}</p>
                                            {margin == null ? (
                                                <span className="text-sm text-gray-400">—</span>
                                            ) : margin >= 0 ? (
                                                <span className="flex items-center justify-center gap-0.5 text-sm text-green-700 font-medium font-mono">
                                                    <TrendingUp className="w-3 h-3" />{formatPrice(margin)}
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-0.5 text-sm text-red-600 font-medium font-mono">
                                                    <TrendingDown className="w-3 h-3" />{formatPrice(margin)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── Desktop table (≥ sm) ─── */}
                    <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('items.name')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('items.category')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('items.unit')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pricing.buyingPrice')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pricing.sellingPrice')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pricing.margin')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map(item => {
                                    const margin = getMargin(item);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{item.category || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700 font-mono">{formatPrice(item.buying_price)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700 font-mono">{formatPrice(item.selling_price)}</td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                {margin == null ? (
                                                    <span className="text-gray-400">—</span>
                                                ) : margin >= 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-green-700 font-medium font-mono">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        {formatPrice(margin)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-medium font-mono">
                                                        <TrendingDown className="w-3.5 h-3.5" />
                                                        {formatPrice(margin)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
