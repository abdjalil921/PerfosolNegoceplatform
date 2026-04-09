import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPresetRange } from '../../lib/dateUtils';

export default function DateRangeFilter({ onChange }) {
    const { t } = useTranslation();
    const PRESETS = [
        { key: 'all', label: t('dateFilter.allTime') },
        { key: 'today', label: t('dateFilter.today') },
        { key: 'yesterday', label: t('dateFilter.yesterday') },
        { key: 'this_week', label: t('dateFilter.thisWeek') },
        { key: 'this_month', label: t('dateFilter.thisMonth') },
        { key: 'custom', label: t('dateFilter.custom') },
    ];
    const [active, setActive] = useState('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handlePreset = (key) => {
        setActive(key);
        if (key === 'custom') {
            setShowCustom(true);
            return;
        }
        setShowCustom(false);
        onChange(getPresetRange(key));
    };

    const handleCustomApply = () => {
        if (!customFrom && !customTo) { onChange(null); return; }
        onChange({
            from: customFrom ? new Date(customFrom) : null,
            to: customTo ? new Date(customTo + 'T23:59:59') : null,
        });
    };

    const handleClearCustom = () => {
        setCustomFrom('');
        setCustomTo('');
        setActive('all');
        setShowCustom(false);
        onChange(null);
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                    <button
                        key={p.key}
                        onClick={() => handlePreset(p.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${active === p.key
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {p.key === 'custom' && <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />}
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Custom date range */}
            {showCustom && (
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-gray-500">{t('dateFilter.from')}</span>
                    <input
                        type="date"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <span className="text-xs font-medium text-gray-500">{t('dateFilter.to')}</span>
                    <input
                        type="date"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <button
                        onClick={handleCustomApply}
                        className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:brightness-110"
                    >
                        {t('dateFilter.apply')}
                    </button>
                    <button
                        onClick={handleClearCustom}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Clear"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
