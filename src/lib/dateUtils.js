/**
 * Returns { from: Date, to: Date } for a given preset key.
 * Returns null for 'all'.
 */
export const getPresetRange = (preset) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
        case 'today':
            return { from: startOfToday, to: now };

        case 'yesterday': {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - 1);
            const end = new Date(startOfToday);
            end.setMilliseconds(-1);
            return { from: start, to: end };
        }

        case 'this_week': {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - start.getDay()); // Sunday
            return { from: start, to: now };
        }

        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from: start, to: now };
        }

        default:
            return null; // 'all'
    }
};

/**
 * Filters an array by a date field within the given range.
 * range: { from: Date|null, to: Date|null } | null
 */
export const filterByDateRange = (items, dateField, range) => {
    if (!range) return items;
    return items.filter(item => {
        const d = new Date(item[dateField]);
        if (range.from && d < range.from) return false;
        if (range.to && d > range.to) return false;
        return true;
    });
};
