// Money display used by the accounting pages.
export function fmtMoney(value, { min = 2, max = 2, dash = false } = {}) {
    if (dash && (value == null || value === '')) return '—';
    const n = Number(value);
    return (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
        minimumFractionDigits: min,
        maximumFractionDigits: max,
    });
}
