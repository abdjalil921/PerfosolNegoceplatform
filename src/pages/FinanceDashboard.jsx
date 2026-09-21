import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSales } from '../hooks/useSales';
import { usePurchases } from '../hooks/usePurchases';
import { useCaisse } from '../hooks/useCaisse';
import { useBankPayments } from '../hooks/useBankPayments';
import { useTva } from '../hooks/useTva';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import {
    TrendingUp, TrendingDown, DollarSign, Percent, Wallet,
    Landmark, ArrowUpRight, ArrowDownRight, Layers,
    Calendar, Printer, RefreshCw, ChevronRight, Activity, LineChart
} from 'lucide-react';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getGreeting = (t) => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
};

const today = () => new Date().toISOString().split('T')[0];

const escapeHtml = (unsafe) => {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export default function FinanceDashboard() {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';

    // Fetch data from hooks
    const { sales, loading: salesLoading, refetch: fetchSales } = useSales();
    const { purchases, loading: purchasesLoading, refetch: fetchPurchases } = usePurchases();
    const { transactions: caisseTx, loading: caisseLoading, refetch: fetchCaisse } = useCaisse();
    const { transactions: bankTx, loading: bankLoading, refetch: fetchBank } = useBankPayments();
    const { transactions: tvaTx, loading: tvaLoading, refetch: fetchTva } = useTva();

    const loading = salesLoading || purchasesLoading || caisseLoading || bankLoading || tvaLoading;

    // ── Filter State ──
    const [rangeType, setRangeType] = useState('thisYear'); // thisMonth | last3Months | thisYear | allTime | custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Compute effective start & end dates based on rangeType
    const dateRange = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();

        switch (rangeType) {
            case 'thisMonth': {
                const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                const end = today();
                return { start, end };
            }
            case 'last3Months': {
                const threeMonthsAgo = new Date(y, m - 3, 1);
                const start = threeMonthsAgo.toISOString().split('T')[0];
                const end = today();
                return { start, end };
            }
            case 'thisYear': {
                const start = `${y}-01-01`;
                const end = `${y}-12-31`;
                return { start, end };
            }
            case 'custom': {
                return { start: customStart || '1970-01-01', end: customEnd || '2099-12-31' };
            }
            case 'allTime':
            default:
                return { start: '', end: '' };
        }
    }, [rangeType, customStart, customEnd]);

    // ── Data Filtering ──
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const d = s.transaction_date || '';
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
        });
    }, [sales, dateRange]);

    const filteredPurchases = useMemo(() => {
        return purchases.filter(p => {
            const d = p.transaction_date || '';
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
        });
    }, [purchases, dateRange]);

    const filteredCaisse = useMemo(() => {
        return caisseTx.filter(c => {
            const d = c.transaction_date || '';
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
        });
    }, [caisseTx, dateRange]);

    const filteredBank = useMemo(() => {
        return bankTx.filter(b => {
            const d = b.transaction_date || '';
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
        });
    }, [bankTx, dateRange]);

    // ── Metric Calculations ──
    const revenueHT = useMemo(() => filteredSales.reduce((sum, s) => sum + (Number(s.price_ht) || 0), 0), [filteredSales]);
    const revenueTTC = useMemo(() => filteredSales.reduce((sum, s) => sum + (Number(s.total_ttc) || 0), 0), [filteredSales]);

    const expensesHT = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.price_ht) || 0), 0), [filteredPurchases]);
    const expensesTTC = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.total_ttc) || 0), 0), [filteredPurchases]);

    const netProfit = revenueHT - expensesHT;
    const profitMargin = revenueHT > 0 ? (netProfit / revenueHT) * 100 : 0;

    // Caisse Balance (paid only)
    const caisseBalance = useMemo(() => {
        const paid = caisseTx.filter(t => t.payment_date);
        const entrees = paid.reduce((sum, t) => sum + (Number(t.entrees) || 0), 0);
        const sorties = paid.reduce((sum, t) => sum + (Number(t.sorties) || 0), 0);
        return entrees - sorties;
    }, [caisseTx]);

    // Bank Balance (all records)
    const bankBalance = useMemo(() => {
        const entrees = bankTx.reduce((sum, t) => sum + (Number(t.entrees) || 0), 0);
        const sorties = bankTx.reduce((sum, t) => sum + (Number(t.sorties) || 0), 0);
        return entrees - sorties;
    }, [bankTx]);

    const totalLiquidity = caisseBalance + bankBalance;

    // TVA Statement
    const filteredTva = useMemo(() => {
        return tvaTx.filter(tx => {
            const d = tx.date || '';
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
        });
    }, [tvaTx, dateRange]);

    const tvaCollected = useMemo(() => {
        return filteredTva
            .filter(tx => tx.type === 'vente')
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [filteredTva]);

    const tvaDeductible = useMemo(() => {
        return filteredTva
            .filter(tx => tx.type === 'achat')
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [filteredTva]);

    const netTVA = tvaCollected - tvaDeductible;

    // ── Payment Method Distribution (Sales) ──
    const paymentMethods = useMemo(() => {
        const counts = { cash: 0, bankTransfer: 0, check: 0, other: 0 };
        let total = 0;

        filteredSales.forEach(s => {
            const method = (s.payment_method || '').toLowerCase();
            const val = Number(s.total_ttc) || 0;
            if (method.includes('caisse') || method.includes('espèce') || method.includes('cash')) {
                counts.cash += val;
            } else if (method.includes('virement') || method.includes('transfer') || method.includes('bancaire')) {
                counts.bankTransfer += val;
            } else if (method.includes('chèque') || method.includes('cheque') || method.includes('check')) {
                counts.check += val;
            } else {
                counts.other += val;
            }
            total += val;
        });

        return Object.entries(counts).map(([key, value]) => ({
            name: t(`finance.${key}`),
            value,
            percentage: total > 0 ? (value / total) * 100 : 0
        })).sort((a, b) => b.value - a.value);
    }, [filteredSales, t]);

    // ── Consolidated Recent Cash Flow ──
    const recentTransactions = useMemo(() => {
        const list = [];
        // Combine sales, purchases, bank, caisse
        filteredSales.forEach(s => list.push({
            id: `sale-${s.id}`,
            date: s.transaction_date,
            libelle: `${t('finance.revenue')}: ${s.company_name || 'CLIENT'}`,
            amount: Number(s.total_ttc) || 0,
            type: 'in',
            source: 'Sales'
        }));
        filteredPurchases.forEach(p => list.push({
            id: `pur-${p.id}`,
            date: p.transaction_date,
            libelle: `${t('finance.expenses')}: ${p.company_name || 'FOURNISSEUR'}`,
            amount: Number(p.total_ttc) || 0,
            type: 'out',
            source: 'Purchases'
        }));
        filteredCaisse.forEach(c => {
            if (!c.source_type) { // Manual caisse transactions only
                if (c.entrees > 0) list.push({ id: `caisse-${c.id}`, date: c.transaction_date, libelle: c.libelle || 'Caisse Entry', amount: c.entrees, type: 'in', source: 'Caisse' });
                if (c.sorties > 0) list.push({ id: `caisse-${c.id}`, date: c.transaction_date, libelle: c.libelle || 'Caisse Exit', amount: c.sorties, type: 'out', source: 'Caisse' });
            }
        });
        filteredBank.forEach(b => {
            if (!b.source_type) { // Manual bank payments only
                if (b.entrees > 0) list.push({ id: `bank-${b.id}`, date: b.transaction_date, libelle: b.libelle || 'Bank Entry', amount: b.entrees, type: 'in', source: 'Bank' });
                if (b.sorties > 0) list.push({ id: `bank-${b.id}`, date: b.transaction_date, libelle: b.libelle || 'Bank Exit', amount: b.sorties, type: 'out', source: 'Bank' });
            }
        });

        return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    }, [filteredSales, filteredPurchases, filteredCaisse, filteredBank, t]);

    // ── Monthly Aggregations for Charts ──
    const monthlyStats = useMemo(() => {
        const stats = {}; // key: YYYY-MM

        // Determine date bounds
        let sRange = dateRange.start;
        let eRange = dateRange.end;

        if (!sRange || sRange === '1970-01-01') {
            // Find earliest date in records
            const allDates = [...sales, ...purchases].map(r => r.transaction_date).filter(Boolean).sort();
            sRange = allDates[0] || `${new Date().getFullYear()}-01-01`;
        }
        if (!eRange || eRange === '2099-12-31') {
            eRange = today();
        }

        const startObj = new Date(sRange);
        const endObj = new Date(eRange);

        // Pre-populate months in range to guarantee order
        let curr = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
        const limit = new Date(endObj.getFullYear(), endObj.getMonth() + 1, 1);
        while (curr < limit) {
            const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
            stats[key] = { sales: 0, purchases: 0 };
            curr.setMonth(curr.getMonth() + 1);
        }

        // Aggregate Sales
        filteredSales.forEach(s => {
            if (!s.transaction_date) return;
            const key = s.transaction_date.substring(0, 7);
            if (stats[key]) stats[key].sales += Number(s.price_ht) || 0;
        });

        // Aggregate Purchases
        filteredPurchases.forEach(p => {
            if (!p.transaction_date) return;
            const key = p.transaction_date.substring(0, 7);
            if (stats[key]) stats[key].purchases += Number(p.price_ht) || 0;
        });

        const sortedKeys = Object.keys(stats).sort();
        const labels = sortedKeys.map(k => {
            const [year, month] = k.split('-');
            const d = new Date(Number(year), Number(month) - 1, 1);
            return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { month: 'short', year: '2-digit' });
        });

        return {
            labels,
            salesData: sortedKeys.map(k => stats[k].sales),
            purchasesData: sortedKeys.map(k => stats[k].purchases),
            netData: sortedKeys.map(k => stats[k].sales - stats[k].purchases)
        };
    }, [filteredSales, filteredPurchases, sales, purchases, dateRange, i18n.language]);

    // Refresh Data
    const handleRefresh = async () => {
        await Promise.all([fetchSales(), fetchPurchases(), fetchCaisse(), fetchBank(), fetchTva()]);
    };

    // Print financial report window
    const handlePrint = () => {
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>${t('finance.title')} – ${escapeHtml(displayName)}</title>
<style>
  @page{size:A4 portrait;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;line-height:1.4}
  .header{text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0284c7}
  .header h1{font-size:20px;font-weight:700;color:#0284c7}.header p{font-size:10px;color:#666;margin-top:2px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:25px}
  .card{border:1px solid #ddd;border-radius:8px;padding:12px;background:#f9fafb}
  .card h3{font-size:9px;color:#666;text-transform:uppercase;font-weight:700}
  .card p{font-size:16px;font-weight:700;margin-top:4px;font-family:monospace}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  thead{background:#f0f9ff}th{padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#0369a1;border-bottom:2px solid #bae6fd;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafafa}
  .total-row td{font-weight:700;background:#eff6ff!important;border-top:1.5px solid #bae6fd}
  .footer{margin-top:30px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('finance.title')} – ${escapeHtml(displayName)}</h1>
    <p>Généré le ${new Date().toLocaleDateString()} | Période: ${rangeType === 'allTime' ? 'Tout historique' : `${dateRange.start} → ${dateRange.end}`}</p>
  </div>
  <div class="grid">
    <div class="card">
      <h3>${t('finance.revenue')} (HT)</h3>
      <p>${fmt(revenueHT)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.expenses')} (HT)</h3>
      <p>${fmt(expensesHT)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.netProfit')} (HT)</h3>
      <p style="color:${netProfit >= 0 ? '#16a34a' : '#dc2626'}">${fmt(netProfit)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.caisseBalance')}</h3>
      <p>${fmt(caisseBalance)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.bankBalance')}</h3>
      <p>${fmt(bankBalance)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.totalLiquidity')}</h3>
      <p>${fmt(totalLiquidity)} MAD</p>
    </div>
  </div>

  <h2 style="font-size:14px;color:#0369a1;margin-bottom:10px;border-bottom:1.5px solid #e0f2fe;padding-bottom:4px">${t('finance.tvaSummary')}</h2>
  <div class="grid">
    <div class="card">
      <h3>${t('finance.collectedTva')}</h3>
      <p>${fmt(tvaCollected)} MAD</p>
    </div>
    <div class="card">
      <h3>${t('finance.deductibleTva')}</h3>
      <p>${fmt(tvaDeductible)} MAD</p>
    </div>
    <div class="card">
      <h3>${netTVA >= 0 ? t('finance.tvaNet') : t('finance.tvaCredit')}</h3>
      <p style="color:${netTVA >= 0 ? '#dc2626' : '#16a34a'}">${fmt(Math.abs(netTVA))} MAD</p>
    </div>
  </div>
  
  <div class="footer">Logiciel de gestion MECAWOOD S.A.R.L</div>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

        const win = window.open('', '_blank', 'width=850,height=700');
        win.document.write(html); win.document.close();
    };

    return (
        <div className="space-y-6 px-1 py-2 md:px-4">

            {/* ── Welcome Banner & Date Filters ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 border border-sky-100 shadow-sm flex-shrink-0">
                        <LineChart className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">
                            {getGreeting(t)}, {profile?.full_name || 'Admin'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {t('finance.title')} — <span className="font-semibold text-gray-700">{displayName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Predefined date filters (Mobile dropdown) */}
                    <div className="block md:hidden w-full">
                        <select
                            value={rangeType}
                            onChange={e => setRangeType(e.target.value)}
                            className="block w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-700 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                        >
                            {['thisMonth', 'last3Months', 'thisYear', 'allTime', 'custom'].map(type => (
                                <option key={type} value={type}>
                                    {t(`finance.${type}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Predefined date filters (Desktop buttons) */}
                    <div className="hidden md:flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
                        {['thisMonth', 'last3Months', 'thisYear', 'allTime', 'custom'].map(type => (
                            <button
                                key={type}
                                onClick={() => setRangeType(type)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    rangeType === type
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {t(`finance.${type}`)}
                            </button>
                        ))}
                    </div>

                    {/* Custom Range inputs */}
                    {rangeType === 'custom' && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200 animate-fadeIn">
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="bg-transparent border-0 p-0 text-xs font-semibold focus:ring-0 text-gray-700 w-28 focus:outline-none"
                            />
                            <span className="text-gray-400 text-xs font-medium">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="bg-transparent border-0 p-0 text-xs font-semibold focus:ring-0 text-gray-700 w-28 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Print & Refresh */}
                    <button
                        onClick={handlePrint}
                        title="Print Financial Report"
                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors shadow-sm bg-white"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleRefresh}
                        title="Refresh Financial Data"
                        className={`p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors shadow-sm bg-white ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Row 1: Key Financial Performance Indicators ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('finance.revenue')}
                        </span>
                        <h2 className="text-2xl font-bold font-mono text-gray-800">
                            {fmt(revenueHT)}
                            <span className="text-xs font-normal text-gray-400 ml-1">MAD</span>
                        </h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            TTC: {fmt(revenueTTC)} MAD
                        </span>
                    </div>
                    <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500" />
                </div>

                {/* Expenses Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('finance.expenses')}
                        </span>
                        <h2 className="text-2xl font-bold font-mono text-gray-800">
                            {fmt(expensesHT)}
                            <span className="text-xs font-normal text-gray-400 ml-1">MAD</span>
                        </h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            TTC: {fmt(expensesTTC)} MAD
                        </span>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                </div>

                {/* Net Profit Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('finance.netProfit')}
                        </span>
                        <h2 className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
                            <span className="text-xs font-normal text-gray-400 ml-1">MAD</span>
                        </h2>
                        <div className="flex items-center gap-1">
                            {netProfit >= 0 ? (
                                <span className="inline-flex items-center text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md">
                                    <ArrowUpRight className="w-3 h-3" /> Positive
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md">
                                    <ArrowDownRight className="w-3 h-3" /> Deficit
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <span className={`absolute bottom-0 left-0 right-0 h-1 ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>

                {/* Profit Margin Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('finance.profitMargin')}
                        </span>
                        <h2 className="text-2xl font-bold font-mono text-gray-800">
                            {profitMargin.toFixed(1)}%
                        </h2>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                            <div
                                className={`h-1.5 rounded-full ${profitMargin >= 30 ? 'bg-emerald-500' : profitMargin >= 15 ? 'bg-sky-500' : profitMargin > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-violet-50 p-2.5 rounded-xl text-violet-600 group-hover:scale-110 transition-transform">
                        <Percent className="w-5 h-5" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-violet-500" />
                </div>
            </div>

            {/* ── Row 2: Liquidity Status ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cash Balance */}
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:rotate-12 transition-transform">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">
                                {t('finance.caisseBalance')}
                            </span>
                            <h3 className="text-xl font-bold font-mono text-gray-800 mt-1">
                                {fmt(caisseBalance)} <span className="text-xs font-normal text-gray-400">MAD</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Bank Balance */}
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:rotate-12 transition-transform">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">
                                {t('finance.bankBalance')}
                            </span>
                            <h3 className="text-xl font-bold font-mono text-gray-800 mt-1">
                                {fmt(bankBalance)} <span className="text-xs font-normal text-gray-400">MAD</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Total Liquidity */}
                <div className="bg-gradient-to-r from-sky-600 to-sky-700 shadow-md rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-white/10 p-3 rounded-xl text-white group-hover:rotate-12 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-sky-100 block uppercase tracking-wider">
                                {t('finance.totalLiquidity')}
                            </span>
                            <h3 className="text-xl font-bold font-mono text-white mt-1">
                                {fmt(totalLiquidity)} <span className="text-xs font-normal text-sky-200">MAD</span>
                            </h3>
                        </div>
                    </div>
                    {/* Diagonal accent elements */}
                    <div className="absolute right-[-10px] bottom-[-20px] w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                </div>
            </div>

            {/* ── Row 3: Charts & Summary Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2/3): Trend Charts */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Chart 1: Income vs Expense Area Chart */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {t('finance.salesVsPurchases')}
                            </h3>
                        </div>
                        <div className="h-72">
                            {monthlyStats.labels.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                    No records for this range
                                </div>
                            ) : (
                                <Line
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 'bold', size: 10 } } },
                                            tooltip: { padding: 10 }
                                        },
                                        scales: {
                                            y: { grid: { borderDash: [5, 5] }, ticks: { font: { size: 10 } } },
                                            x: { ticks: { font: { size: 10 } } }
                                        }
                                    }}
                                    data={{
                                        labels: monthlyStats.labels,
                                        datasets: [
                                            {
                                                label: t('finance.revenue') + ' (HT)',
                                                data: monthlyStats.salesData,
                                                borderColor: 'rgb(56, 189, 248)',
                                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                                fill: true,
                                                tension: 0.3
                                            },
                                            {
                                                label: t('finance.expenses') + ' (HT)',
                                                data: monthlyStats.purchasesData,
                                                borderColor: 'rgb(245, 158, 11)',
                                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                fill: true,
                                                tension: 0.3
                                            }
                                        ]
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Net Cash Flow Bar Chart */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {t('finance.netCashFlow')}
                            </h3>
                        </div>
                        <div className="h-64">
                            {monthlyStats.labels.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                    No records for this range
                                </div>
                            ) : (
                                <Bar
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: { padding: 10 }
                                        },
                                        scales: {
                                            y: { grid: { borderDash: [5, 5] }, ticks: { font: { size: 10 } } },
                                            x: { ticks: { font: { size: 10 } } }
                                        }
                                    }}
                                    data={{
                                        labels: monthlyStats.labels,
                                        datasets: [
                                            {
                                                data: monthlyStats.netData,
                                                backgroundColor: monthlyStats.netData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                                                borderRadius: 6
                                            }
                                        ]
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (1/3): Summary Cards */}
                <div className="space-y-6">

                    {/* Card 1: VAT Declaration Box */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                            {t('finance.tvaSummary')}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                <span className="text-gray-500 font-semibold">{t('finance.collectedTva')}</span>
                                <span className="font-mono text-gray-900 font-bold">{fmt(tvaCollected)} MAD</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                <span className="text-gray-500 font-semibold">{t('finance.deductibleTva')}</span>
                                <span className="font-mono text-gray-900 font-bold">{fmt(tvaDeductible)} MAD</span>
                            </div>
                            <div className="pt-2">
                                <div className="flex justify-between items-center text-sm mb-1.5">
                                    <span className="text-gray-800 font-bold">
                                        {netTVA >= 0 ? t('finance.tvaNet') : t('finance.tvaCredit')}
                                    </span>
                                    <span className={`font-mono font-bold ${netTVA >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {fmt(Math.abs(netTVA))} MAD
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${netTVA >= 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(100, (Math.abs(netTVA) / Math.max(tvaCollected, tvaDeductible, 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Payment Methods distribution */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                            {t('finance.paymentMethods')}
                        </h3>
                        <div className="space-y-4">
                            {paymentMethods.map(item => (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-gray-600">{item.name}</span>
                                        <span className="text-gray-900 font-mono">
                                            {fmt(item.value)} MAD ({item.percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-sky-500"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 4: Consolidated Recent Transactions ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        {t('finance.recentTx')}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-5 py-3">{t('caisse.transactionDate')}</th>
                                <th className="px-5 py-3">Description</th>
                                <th className="px-5 py-3">Source</th>
                                <th className="px-5 py-3 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors text-xs">
                                    <td className="px-5 py-3 text-gray-500 font-medium">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3 text-gray-900 font-semibold">
                                        {tx.libelle}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tx.source === 'Sales' ? 'bg-sky-50 text-sky-600' :
                                            tx.source === 'Purchases' ? 'bg-amber-50 text-amber-600' :
                                            tx.source === 'Caisse' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {tx.source}
                                        </span>
                                    </td>
                                    <td className={`px-5 py-3 text-right font-bold font-mono ${
                                        tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)} MAD
                                    </td>
                                </tr>
                            ))}
                            {recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-6 text-gray-400 text-xs">
                                        No recent transactions for this filter
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
