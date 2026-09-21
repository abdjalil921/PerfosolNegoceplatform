import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, X } from 'lucide-react';

const FIELDS = [
    { name: 'Code journal', required: true },
    { name: 'Date de pièce', required: true },
    { name: 'N° compte général', required: true },
    { name: 'Numéro facture', required: false },
    { name: 'N° compte tiers', required: false },
    { name: 'Libellé écriture', required: false },
    { name: 'Montant débit', required: false },
    { name: 'Montant crédit', required: false },
];

const PARTICULARITES = [
    ['Origine du fichier', 'Windows'],
    ["Délimiteur d'enregistrement", 'Retour-chariot'],
    ['Délimiteur champ', 'Tabulation'],
    ['Nombre de décimales', '2'],
    ['Séparateur des décimales', 'Virgule'],
    ["Début d'enregistrement", '1'],
];

const CHECKBOXES = [
    { label: 'Importer le lettrage', checked: false },
    { label: 'Appliquer la numérotation du fichier comptable', checked: true, note: true },
    { label: 'Générer les registres de taxe', checked: false },
];

function Field({ children }) {
    return <span className="font-mono text-[12px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{children}</span>;
}

function Step({ n, title, children }) {
    return (
        <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f6f9eb] text-[#568203] text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{title}</p>
                {children && <div className="text-xs text-gray-500 mt-0.5 space-y-2">{children}</div>}
            </div>
        </li>
    );
}

export default function SageSetupGuideModal({ onClose }) {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#f6f9eb] p-2 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5 text-[#6f9100]" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">{t('purchases.sageGuideTitle')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6 overflow-y-auto">
                    <p className="text-xs text-gray-500">{t('purchases.sageGuideIntro')}</p>

                    {/* ── Part A ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-[#8DB600] text-white rounded px-1.5 py-0.5">A</span>
                            <h3 className="text-sm font-semibold text-gray-800">{t('purchases.sageGuideSectionA')}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{t('purchases.sageGuideSectionADesc')}</p>
                        <ol className="space-y-4">
                            <Step n={1} title={t('purchases.sageGuideAStep1Title')}>
                                <p><Field>Fichier → Format import/export paramétrable... → Nouveau</Field></p>
                                <p>{t('purchases.sageGuideAStep1Body')}</p>
                            </Step>
                            <Step n={2} title={t('purchases.sageGuideAStep2Title')}>
                                <p>{t('purchases.sageGuideAStep2Body')}</p>
                                <div className="rounded-lg border border-gray-100 overflow-hidden">
                                    {FIELDS.map((f, i) => (
                                        <div key={f.name} className={`flex items-center justify-between px-2.5 py-1.5 text-[12px] ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <span className="font-mono text-gray-800">{i + 1}. {f.name}</span>
                                            {f.required && <span className="text-[10px] font-semibold text-[#568203] bg-[#f2f7e7] px-1.5 py-0.5 rounded">requis</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">{t('purchases.sageGuideAStep2Note')}</p>
                            </Step>
                            <Step n={3} title={t('purchases.sageGuideAStep3Title')}>
                                <p>{t('purchases.sageGuideAStep3Body')}</p>
                            </Step>
                            <Step n={4} title={t('purchases.sageGuideAStep4Title')}>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PARTICULARITES.map(([k, v]) => (
                                        <div key={k} className="flex justify-between bg-gray-50 rounded px-2 py-1 text-[11px]">
                                            <span className="text-gray-500">{k}</span>
                                            <span className="font-mono font-medium text-gray-800">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </Step>
                            <Step n={5} title={t('purchases.sageGuideAStep5Title')}>
                                <p>{t('purchases.sageGuideAStep5Body')}</p>
                            </Step>
                        </ol>
                    </div>

                    {/* ── Part B ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-[#8DB600] text-white rounded px-1.5 py-0.5">B</span>
                            <h3 className="text-sm font-semibold text-gray-800">{t('purchases.sageGuideSectionB')}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{t('purchases.sageGuideSectionBDesc')}</p>
                        <ol className="space-y-4">
                            <Step n={1} title={t('purchases.sageGuideBStep1Title')}>
                                <p>{t('purchases.sageGuideBStep1Body')}</p>
                            </Step>
                            <Step n={2} title={t('purchases.sageGuideBStep2Title')}>
                                <p>{t('purchases.sageGuideBStep2Body')}</p>
                            </Step>
                            <Step n={3} title={t('purchases.sageGuideBStep3Title')}>
                                <p><Field>Fichier → Importer → Format paramétrable...</Field></p>
                                <p>{t('purchases.sageGuideBStep3Body')}</p>
                            </Step>
                            <Step n={4} title={t('purchases.sageGuideBStep4Title')}>
                                <ul className="space-y-1">
                                    {CHECKBOXES.map(c => (
                                        <li key={c.label} className="flex items-center gap-2">
                                            <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 ${c.checked ? 'bg-[#8DB600] border-[#8DB600]' : 'border-gray-300'}`} />
                                            <span>{c.label}{c.note && <span className="text-gray-400"> ({t('purchases.sageGuideCheckboxNote')})</span>}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Step>
                            <Step n={5} title={t('purchases.sageGuideBStep5Title')}>
                                <p>{t('purchases.sageGuideBStep5Body')}</p>
                            </Step>
                        </ol>
                        <div className="mt-3 rounded-lg border border-[#8DB600] bg-[#f6f9eb] px-3 py-2.5 text-xs text-gray-700">
                            <span className="font-bold text-[#568203] uppercase text-[10px] mr-1.5">{t('purchases.sageGuideAlways')}</span>
                            {t('purchases.sageGuideVerify')}
                        </div>
                    </div>

                    {/* ── Gotchas ── */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('purchases.sageGuideGotchasTitle')}</h3>
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                                    <p className="text-xs font-semibold text-amber-800">{t(`purchases.sageGuideGotcha${i}Title`)}</p>
                                    <p className="text-xs text-gray-600 mt-0.5">{t(`purchases.sageGuideGotcha${i}Body`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#8DB600] hover:bg-[#6f9100] rounded-lg transition-colors">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
