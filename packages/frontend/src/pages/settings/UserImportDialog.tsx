import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useImportUsers, type ImportUsersResponse } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATE_CSV = `email,display_name,role,group
max.mustermann@example.com,Max Mustermann,agent,Support
anna.schmidt@example.com,Anna Schmidt,admin,Management`;

const MAX_PREVIEW_ROWS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedRow {
  line: number;
  email: string;
  display_name: string;
  role: string;
  group: string;
  error?: string;
}

function parseCSV(csv: string): ParsedRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    const email = cols[0] ?? '';
    const display_name = cols[1] ?? '';
    const role = cols[2] ?? '';
    const group = cols[3] ?? '';

    let error: string | undefined;
    if (!email || !email.includes('@')) {
      error = 'Invalid email';
    } else if (!display_name) {
      error = 'Missing display name';
    }

    rows.push({ line: i + 1, email, display_name, role, group, error });
  }
  return rows;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'opsweave-user-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 'upload' | 'preview' | 'result';

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserImportDialog({ open, onOpenChange }: UserImportDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');

  const importUsers = useImportUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportUsersResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) {
      setStep('upload');
      setCsvContent('');
      setParsedRows([]);
      setResult(null);
      importUsers.reset();
    }
    onOpenChange(v);
  }, [onOpenChange, importUsers]);

  // Read file content
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      const rows = parseCSV(text);
      setParsedRows(rows);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  // File input change
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  // Drag & drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFile(file);
    }
  }, [handleFile]);

  // Submit import
  const handleImport = useCallback(async () => {
    try {
      const res = await importUsers.mutateAsync(csvContent);
      setResult(res);
      setStep('result');
    } catch {
      // Error is handled via importUsers.isError
    }
  }, [csvContent, importUsers]);

  const hasValidationErrors = parsedRows.some(r => !!r.error);
  const previewRows = parsedRows.slice(0, MAX_PREVIEW_ROWS);
  const remainingCount = parsedRows.length - MAX_PREVIEW_ROWS;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-import-users">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('settings:users.import.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              className={`
                relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                px-6 py-12 text-center transition-colors cursor-pointer
                ${dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
              `}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <FileText className="h-10 w-10 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('settings:users.import.dropzone')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {t('settings:users.import.dropzone_hint')}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                data-testid="input-csv-file"
                onChange={onFileChange}
              />
            </div>

            {/* Template download */}
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" data-testid="btn-download-template" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                {t('settings:users.import.template')}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('settings:users.import.preview')} ({parsedRows.length} {parsedRows.length === 1 ? 'row' : 'rows'})
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setStep('upload'); setCsvContent(''); setParsedRows([]); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table data-testid="table-import-preview">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow
                      key={row.line}
                      className={row.error ? 'bg-red-50 dark:bg-red-950/20' : ''}
                    >
                      <TableCell className="text-xs text-slate-400">{row.line}</TableCell>
                      <TableCell className="text-sm font-mono">{row.email}</TableCell>
                      <TableCell className="text-sm">{row.display_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.group}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {remainingCount > 0 && (
              <p className="text-xs text-slate-400 text-center">
                +{remainingCount} more rows
              </p>
            )}

            {hasValidationErrors && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {parsedRows.filter(r => r.error).length} row(s) have validation errors and will be skipped.
                </p>
              </div>
            )}

            {importUsers.isError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {importUsers.error?.message ?? tCommon('error')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex items-center gap-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t('settings:users.import.success', { count: result.imported })}
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {result.skipped} skipped
                  </p>
                )}
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {t('settings:users.import.errors_title')}
                </p>
                <div className="rounded-md border border-red-200 dark:border-red-800 overflow-hidden max-h-40 overflow-y-auto">
                  <div className="p-3 space-y-1">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400 font-mono">
                        {t('settings:users.import.error_line', {
                          line: err.line,
                          email: err.email,
                          reason: err.reason,
                        })}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Credentials */}
            {result.users.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('settings:users.import.credentials_title')}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('settings:users.import.credentials_hint')}
                </p>
                <div className="rounded-md border overflow-hidden max-h-48 overflow-y-auto">
                  <Table data-testid="table-import-credentials">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.users.map((u) => (
                        <TableRow key={u.email}>
                          <TableCell className="text-sm font-mono">{u.email}</TableCell>
                          <TableCell className="text-sm font-mono select-all">
                            {u.temporaryPassword}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setCsvContent(''); setParsedRows([]); }}>
                {tCommon('back')}
              </Button>
              <Button
                data-testid="btn-import-submit"
                onClick={() => { void handleImport(); }}
                disabled={parsedRows.length === 0 || importUsers.isPending}
              >
                {importUsers.isPending
                  ? t('settings:users.import.importing')
                  : t('settings:users.import.button')
                }
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={() => handleOpenChange(false)}>
              {tCommon('close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
