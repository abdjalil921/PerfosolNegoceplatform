import { useState, useRef, useCallback } from 'react';
import {
    ScanLine, Camera, Upload, X, Loader2,
    AlertCircle, FileImage, CheckCircle2, RefreshCw
} from 'lucide-react';
import { fileToScanBlob } from '../lib/pdfToImage';

const WORKER_URL = import.meta.env.VITE_SCAN_RECEIPT_WORKER_URL;

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

/**
 * ScanReceiptModal
 *
 * Props:
 *  onClose()             — called when user dismisses
 *  onExtracted(data)     — called with the raw extracted JSON on success
 *                          (caller is responsible for opening PurchaseModal with pre-fill)
 */
export default function ScanReceiptModal({ onClose, onExtracted }) {
    const [file, setFile] = useState(null);           // selected File object
    const [preview, setPreview] = useState(null);     // object URL for display
    const [pageInfo, setPageInfo] = useState(null);   // { pageCount, pagesScanned }
    const [status, setStatus] = useState('idle');     // idle | converting | scanning | error | done
    const [errorMsg, setErrorMsg] = useState('');

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // ── File selection ────────────────────────────────────────────
    const handleFile = useCallback((selected) => {
        if (!selected) return;
        setFile(selected);
        setErrorMsg('');
        setStatus('idle');
        setPageInfo(null);

        // Show a preview regardless of type
        if (selected.type === 'application/pdf') {
            setPreview(null); // PDF preview handled by placeholder icon
        } else {
            const url = URL.createObjectURL(selected);
            setPreview(url);
        }
    }, []);

    const onInputChange = (e) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
        e.target.value = ''; // allow re-selecting same file
    };

    // Drag & drop
    const onDrop = (e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) handleFile(dropped);
    };

    // ── Scan ─────────────────────────────────────────────────────
    const handleScan = async () => {
        if (!file) return;
        setErrorMsg('');

        try {
            // Step 1 — convert PDF pages to stitched JPEG (or pass image through)
            setStatus('converting');
            const { blob, pageCount, pagesScanned } = await fileToScanBlob(file);
            setPageInfo({ pageCount, pagesScanned });

            // Step 2 — call CF Worker
            setStatus('scanning');
            const formData = new FormData();
            formData.append('image', blob, 'receipt.jpg');

            const res = await fetch(WORKER_URL, { method: 'POST', body: formData });
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || `Worker error ${res.status}`);
            }

            setStatus('done');
            // Small delay so user sees the success state briefly
            setTimeout(() => onExtracted({ ...json.data, _scannedBlob: blob }), 600);

        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Scanning failed. Please try again.');
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setPageInfo(null);
        setStatus('idle');
        setErrorMsg('');
    };

    // ── Render helpers ────────────────────────────────────────────
    const isPDF = file?.type === 'application/pdf';
    const isConverting = status === 'converting';
    const isScanning = status === 'scanning';
    const isBusy = isConverting || isScanning;
    const isDone = status === 'done';
    const isError = status === 'error';

    const busyLabel = isConverting
        ? 'Converting PDF…'
        : 'Scanning invoice…';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-50 p-2 rounded-lg">
                            <ScanLine className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Scan Receipt</h2>
                            <p className="text-xs text-gray-400">Upload or photograph a supplier invoice</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                        disabled={isBusy}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">

                    {/* ── Drop zone / Preview ── */}
                    {!file ? (
                        <div
                            onDrop={onDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600">
                                Drop invoice here or <span className="text-orange-600 underline underline-offset-2">browse</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF (up to 3 pages)</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            {/* Preview */}
                            <div className="bg-gray-50 flex items-center justify-center h-48 relative">
                                {isPDF ? (
                                    <div className="text-center">
                                        <FileImage className="w-14 h-14 text-red-400 mx-auto mb-1" />
                                        <p className="text-xs font-medium text-gray-600">{file.name}</p>
                                    </div>
                                ) : (
                                    <img
                                        src={preview}
                                        alt="Receipt preview"
                                        className="max-h-48 max-w-full object-contain"
                                    />
                                )}

                                {/* Success overlay */}
                                {isDone && (
                                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                                    </div>
                                )}

                                {/* Busy overlay */}
                                {isBusy && (
                                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                        <p className="text-sm font-medium text-gray-700">{busyLabel}</p>
                                    </div>
                                )}
                            </div>

                            {/* File info row */}
                            <div className="px-3 py-2 bg-white flex items-center justify-between border-t border-gray-100">
                                <div>
                                    <p className="text-xs font-medium text-gray-700 truncate max-w-[200px]">{file.name}</p>
                                    {pageInfo && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {pageInfo.pageCount > pageInfo.pagesScanned
                                                ? `⚠️ ${pageInfo.pageCount}-page PDF — scanning pages 1–${pageInfo.pagesScanned}`
                                                : `${pageInfo.pagesScanned}-page PDF scanned`}
                                        </p>
                                    )}
                                </div>
                                {!isBusy && !isDone && (
                                    <button onClick={reset} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {isError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Scan failed</p>
                                <p className="text-xs mt-0.5 text-red-500">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div className="flex gap-2">
                        {/* Camera button */}
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isBusy || isDone}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                            <Camera className="w-4 h-4" />
                            Camera
                        </button>

                        {/* Browse button (shown only when no file) */}
                        {!file && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                Browse File
                            </button>
                        )}

                        {/* Retry after error */}
                        {isError && (
                            <button
                                type="button"
                                onClick={handleScan}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </button>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Scan button */}
                        {file && !isDone && (
                            <button
                                type="button"
                                onClick={handleScan}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60"
                            >
                                {isBusy
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <ScanLine className="w-4 h-4" />
                                }
                                {isBusy ? 'Scanning…' : 'Scan Receipt'}
                            </button>
                        )}
                    </div>

                    {/* Hidden inputs */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED}
                        className="hidden"
                        onChange={onInputChange}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onInputChange}
                    />
                </div>
            </div>
        </div>
    );
}
