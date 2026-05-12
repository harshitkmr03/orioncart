import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { productAPI } from '../services/api';

const BulkUpload = ({ shopId, onSuccess }) => {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const [message, setMessage] = useState(null);
    const [result, setResult] = useState(null);
    const inputRef = useRef(null);

    const resetState = () => {
        setFile(null);
        setMessage(null);
        setResult(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const closeModal = () => {
        setOpen(false);
        resetState();
    };

    const onFileChange = (event) => {
        setFile(event.target.files && event.target.files[0]);
        setMessage(null);
        setResult(null);
    };

    const downloadTemplate = async () => {
        try {
            setDownloadingTemplate(true);
            setMessage(null);
            const blob = await productAPI.downloadCsvTemplate();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'orioncart-product-template.csv';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to download template' });
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!file) {
            setMessage({ type: 'error', text: 'Select a CSV file first.' });
            return;
        }
        if (!shopId) {
            setMessage({ type: 'error', text: 'Create your shop before using bulk upload.' });
            return;
        }

        try {
            setUploading(true);
            setMessage(null);
            const uploadResult = await productAPI.bulkUpload(shopId, file);
            setResult(uploadResult);

            if (uploadResult.successCount > 0) {
                setMessage({
                    type: uploadResult.errorCount > 0 ? 'warning' : 'success',
                    text: uploadResult.errorCount > 0
                        ? `Imported ${uploadResult.successCount} rows. ${uploadResult.errorCount} rows need attention.`
                        : `Imported ${uploadResult.successCount} rows successfully.`,
                });
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setMessage({ type: 'error', text: 'No rows were imported. Check the error details below.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Upload failed' });
            setResult(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="inline-block">
            <button onClick={() => setOpen(true)} className="btn-secondary flex items-center mr-2">
                <UploadCloud className="h-4 w-4 mr-2" />
                Bulk Upload
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Bulk Upload Inventory</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    Use the template for columns: <span className="font-medium">SKU, Product Name, Price, Quantity, Category</span>.
                                    Low stock threshold, image URL, and description are optional extras.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                disabled={downloadingTemplate}
                                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {downloadingTemplate ? 'Preparing template...' : 'Download Template'}
                            </button>
                        </div>

                        <form onSubmit={submit} className="mt-5 space-y-4">
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center hover:border-primary hover:bg-blue-50/40">
                                <FileSpreadsheet className="h-8 w-8 text-primary" />
                                <span className="mt-3 text-sm font-medium text-gray-800">
                                    {file ? file.name : 'Choose a CSV file'}
                                </span>
                                <span className="mt-1 text-xs text-gray-500">One upload can create new products and update existing SKUs for this shop.</span>
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={onFileChange}
                                    className="hidden"
                                />
                            </label>

                            {message && (
                                <div
                                    className={`rounded-xl px-4 py-3 text-sm ${
                                        message.type === 'error'
                                            ? 'bg-red-50 text-red-700'
                                            : message.type === 'warning'
                                                ? 'bg-amber-50 text-amber-800'
                                                : 'bg-green-50 text-green-700'
                                    }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            {result && (
                                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-xl bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Rows</p>
                                            <p className="mt-1 text-2xl font-bold text-gray-900">{result.totalRows}</p>
                                        </div>
                                        <div className="rounded-xl bg-green-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-green-700">Imported</p>
                                            <p className="mt-1 text-2xl font-bold text-green-800">{result.successCount}</p>
                                        </div>
                                        <div className="rounded-xl bg-red-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-red-700">Errors</p>
                                            <p className="mt-1 text-2xl font-bold text-red-800">{result.errorCount}</p>
                                        </div>
                                    </div>

                                    {result.errors?.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-semibold text-gray-900">Rows needing fixes</p>
                                            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200">
                                                {result.errors.map((error, index) => (
                                                    <div key={`${error.row}-${index}`} className="border-b border-gray-100 px-4 py-3 text-sm last:border-b-0">
                                                        <p className="font-medium text-gray-900">
                                                            Row {error.row}
                                                            {error.sku ? ` - ${error.sku}` : ''}
                                                        </p>
                                                        <p className="mt-1 text-gray-600">{error.error}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {uploading ? 'Uploading...' : 'Upload CSV'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUpload;
