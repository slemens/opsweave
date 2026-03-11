import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// Types & API
// ---------------------------------------------------------------------------

interface ComplianceEvidence {
  id: string;
  control_id: string | null;
  evidence_type: string | null;
  title: string;
  url: string | null;
  description: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

const evidenceKeys = {
  all: ['compliance-evidence'] as const,
  list: () => [...evidenceKeys.all, 'list'] as const,
};

function useEvidence() {
  return useQuery({
    queryKey: evidenceKeys.list(),
    queryFn: () => apiClient.get<ComplianceEvidence[]>('/compliance/evidence'),
  });
}

function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceEvidence>) =>
      apiClient.post<ComplianceEvidence>('/compliance/evidence', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: evidenceKeys.all }); },
  });
}

function useDeleteEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/compliance/evidence/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: evidenceKeys.all }); },
  });
}

const EVIDENCE_TYPES = ['document', 'screenshot', 'log', 'report', 'certificate', 'other'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvidenceTab() {
  const { t } = useTranslation(['compliance', 'common']);

  const { data: evidence, isLoading } = useEvidence();
  const createEvidence = useCreateEvidence();
  const deleteEvidence = useDeleteEvidence();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<string>('document');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const evidenceList = useMemo(() => evidence ?? [], [evidence]);

  function resetForm() {
    setTitle('');
    setEvidenceType('document');
    setUrl('');
    setDescription('');
  }

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createEvidence.mutateAsync({
        title: title.trim(),
        evidence_type: evidenceType,
        url: url.trim() || null,
        description: description.trim() || null,
      });
      toast.success(t('compliance:evidence.create_success'));
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('compliance:evidence.save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEvidence.mutateAsync(id);
      toast.success(t('compliance:evidence.delete_success'));
    } catch {
      toast.error(t('compliance:evidence.save_error'));
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-muted" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              {t('compliance:evidence.title')}
            </CardTitle>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('compliance:evidence.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {evidenceList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('compliance:evidence.empty')}</p>
              <p className="text-xs">{t('compliance:evidence.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('compliance:evidence.title_col')}</TableHead>
                    <TableHead>{t('compliance:evidence.type')}</TableHead>
                    <TableHead>{t('compliance:evidence.url_col')}</TableHead>
                    <TableHead>{t('compliance:evidence.uploaded')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidenceList.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell>
                        <div className="font-medium">{ev.title}</div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {ev.evidence_type ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ev.url ? (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Link
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('compliance:evidence.delete_confirm')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ev.id)}>
                                {t('common:actions.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('compliance:evidence.create')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('compliance:evidence.title_col')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Firewall Configuration Report" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:evidence.type')}</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((et) => (
                      <SelectItem key={et} value={et}>{t(`compliance:evidence.types.${et}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:evidence.url_col')}</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:evidence.description')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!title.trim() || createEvidence.isPending}
            >
              {createEvidence.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
