import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/**
 * Tri-state "Comptabilise" badge shown on sale and purchase rows --
 * posted / edited-since-posted (posted_stale) / not entered. Was
 * duplicated in Sales.jsx and Purchases.jsx.
 */
export default function PostedBadge({ t, ns, posted, stale }) {
    if (posted) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            {t(`${ns}.posted`)}
        </span>
    );
    if (stale) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-100">
            <AlertTriangle className="w-3 h-3" />
            {t(`${ns}.postedEdited`)}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-500 border-gray-200">
            <Clock className="w-3 h-3" />
            {t(`${ns}.notPosted`)}
        </span>
    );
}
