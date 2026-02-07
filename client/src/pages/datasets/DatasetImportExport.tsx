import { useState, useCallback, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { Button, Input, Modal, ModalFooter, Badge } from '../../components/ui';

interface ImportColumn {
    csvHeader: string;
    mappedTo: string;
    sampleData: string[];
}

interface DatasetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    datasetName: string;
    existingColumns: string[];
    onImport: (data: Record<string, unknown>[], columnMapping: Record<string, string>) => Promise<void>;
}

export function DatasetImportModal({
    isOpen,
    onClose,
    datasetName,
    existingColumns,
    onImport,
}: DatasetImportModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [columns, setColumns] = useState<ImportColumn[]>([]);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please select a CSV file');
            return;
        }

        setFile(selectedFile);
        setError(null);

        // Parse CSV
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').map(row =>
                row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
            ).filter(row => row.some(cell => cell.length > 0));

            if (rows.length < 2) {
                setError('CSV file must have a header row and at least one data row');
                return;
            }

            setCsvData(rows);

            // Create column mapping
            const headers = rows[0];
            const sampleRows = rows.slice(1, 4);

            const importColumns: ImportColumn[] = headers.map((header, idx) => ({
                csvHeader: header,
                mappedTo: existingColumns.find(col =>
                    col.toLowerCase() === header.toLowerCase()
                ) || header.toLowerCase().replace(/\s+/g, '_'),
                sampleData: sampleRows.map(row => row[idx] || ''),
            }));

            setColumns(importColumns);
            setStep('mapping');
        };
        reader.readAsText(selectedFile);
    }, [existingColumns]);

    const handleColumnMapping = useCallback((csvHeader: string, mappedTo: string) => {
        setColumns(prev => prev.map(col =>
            col.csvHeader === csvHeader ? { ...col, mappedTo } : col
        ));
    }, []);

    const handleImport = useCallback(async () => {
        setStep('importing');

        try {
            // Convert CSV to objects
            const headers = csvData[0];
            const columnMapping: Record<string, string> = {};
            columns.forEach(col => {
                columnMapping[col.csvHeader] = col.mappedTo;
            });

            const records = csvData.slice(1).map(row => {
                const record: Record<string, unknown> = {};
                headers.forEach((header, idx) => {
                    const mappedKey = columnMapping[header] || header;
                    record[mappedKey] = row[idx];
                });
                return record;
            });

            await onImport(records, columnMapping);
            setImportResult({ success: records.length, failed: 0 });
            setStep('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
            setStep('mapping');
        }
    }, [csvData, columns, onImport]);

    const handleClose = useCallback(() => {
        setStep('upload');
        setFile(null);
        setCsvData([]);
        setColumns([]);
        setImportResult(null);
        setError(null);
        onClose();
    }, [onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Import Data to ${datasetName}`}
            description={
                step === 'upload' ? 'Upload a CSV file to import' :
                    step === 'mapping' ? 'Map CSV columns to dataset fields' :
                        step === 'importing' ? 'Importing data...' :
                            'Import complete'
            }
            size="lg"
        >
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {step === 'upload' && (
                <div className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-surface-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition-colors"
                    >
                        <Upload className="h-10 w-10 text-surface-500 mx-auto mb-3" />
                        <p className="text-surface-200 font-medium">Click to upload CSV file</p>
                        <p className="text-sm text-surface-400 mt-1">or drag and drop</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <ModalFooter>
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    </ModalFooter>
                </div>
            )}

            {step === 'mapping' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-surface-400">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>{file?.name}</span>
                        <Badge variant="info">{csvData.length - 1} rows</Badge>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface-900">
                                <tr className="border-b border-surface-700">
                                    <th className="text-left py-2 px-3 text-surface-400 font-medium">CSV Column</th>
                                    <th className="text-left py-2 px-3 text-surface-400 font-medium">Map To</th>
                                    <th className="text-left py-2 px-3 text-surface-400 font-medium">Sample Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-700/50">
                                {columns.map((col) => (
                                    <tr key={col.csvHeader} className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3 text-surface-200">{col.csvHeader}</td>
                                        <td className="py-2 px-3">
                                            <Input
                                                value={col.mappedTo}
                                                onChange={(e) => handleColumnMapping(col.csvHeader, e.target.value)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-surface-400 text-xs">
                                            {col.sampleData.slice(0, 2).join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
                        <Button onClick={handleImport}>
                            Import {csvData.length - 1} Records
                        </Button>
                    </ModalFooter>
                </div>
            )}

            {step === 'importing' && (
                <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent mx-auto mb-4" />
                    <p className="text-surface-200">Importing data...</p>
                    <p className="text-sm text-surface-400 mt-1">This may take a moment</p>
                </div>
            )}

            {step === 'complete' && importResult && (
                <div className="py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-6 w-6 text-green-400" />
                    </div>
                    <p className="text-surface-200 font-medium">Import Complete!</p>
                    <p className="text-sm text-surface-400 mt-1">
                        Successfully imported {importResult.success} records
                        {importResult.failed > 0 && ` (${importResult.failed} failed)`}
                    </p>
                    <ModalFooter>
                        <Button onClick={handleClose}>Done</Button>
                    </ModalFooter>
                </div>
            )}
        </Modal>
    );
}

// Export Modal Component
interface DatasetExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    datasetName: string;
    recordCount: number;
    onExport: (format: 'csv' | 'excel') => Promise<Blob>;
}

export function DatasetExportModal({
    isOpen,
    onClose,
    datasetName,
    recordCount,
    onExport,
}: DatasetExportModalProps) {
    const [format, setFormat] = useState<'csv' | 'excel'>('csv');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        try {
            const blob = await onExport(format);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${datasetName}.${format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    }, [format, datasetName, onExport, onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Export ${datasetName}`}
            description={`Export ${recordCount} records to a file`}
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-surface-200">Export Format</label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFormat('csv')}
                            className={`flex-1 p-4 rounded-lg border transition-colors ${format === 'csv'
                                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                : 'border-surface-700 text-surface-300 hover:border-surface-600'
                                }`}
                        >
                            <FileSpreadsheet className="h-6 w-6 mx-auto mb-2" />
                            <p className="font-medium">CSV</p>
                            <p className="text-xs text-surface-500 mt-1">Comma-separated values</p>
                        </button>
                        <button
                            onClick={() => setFormat('excel')}
                            className={`flex-1 p-4 rounded-lg border transition-colors ${format === 'excel'
                                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                : 'border-surface-700 text-surface-300 hover:border-surface-600'
                                }`}
                        >
                            <FileSpreadsheet className="h-6 w-6 mx-auto mb-2" />
                            <p className="font-medium">Excel</p>
                            <p className="text-xs text-surface-500 mt-1">Microsoft Excel format</p>
                        </button>
                    </div>
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleExport} isLoading={isExporting}>
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
}
