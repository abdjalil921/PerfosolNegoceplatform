// For timestamps (e.g. "Joined" in admin panel)
export const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d)) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
};

// For plain date strings stored as YYYY-MM-DD
export const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd-mm-yyyy
};

export const getStockColor = (stock) => {
    return stock < 0 ? 'text-red-600' : 'text-green-600'
}

export const getStockBgColor = (stock) => {
    return stock < 0 ? 'bg-red-50' : 'bg-green-50'
}

export const isLowStock = (current, threshold) => {
    return current <= threshold && current >= 0
}

/**
 * Returns 'unpaid' | 'pending' | 'paid' based on payment_date vs today.
 * - 'unpaid'  : no payment_date set
 * - 'pending' : payment_date is in the future
 * - 'paid'    : payment_date is today or in the past
 */
export const getPaymentStatus = (payment_date) => {
    if (!payment_date) return 'unpaid';
    const today = new Date().toISOString().split('T')[0];
    if (payment_date > today) return 'pending';
    return 'paid';
};
