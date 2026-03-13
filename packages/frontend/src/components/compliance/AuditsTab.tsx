import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  MoreHorizontal,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  FileDown,
  FileJson,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { exportAuditCsv, exportAuditJson } from '@/api/compliance';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ---------------------------------------------------------------------------
// Types & API
// ---------------------------------------------------------------------------

interface ComplianceAudit {
  id: string;
  name: string;
  framework_id: string | null;
  audit_type: string | null;
  status: string;
  auditor: string | null;
  start_date: string | null;
  end_date: string | null;
  scope: string | null;
  notes: string | null;
  created_at: string;
}

interface AuditFinding {
  id: string;
  audit_id: string;
  control_id: string | null;
  requirement_id: string | null;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  remediation_plan: string | null;
  due_date: string | null;
}

const auditKeys = {
  all: ['compliance-audits'] as const,
  list: () => [...auditKeys.all, 'list'] as const,
  findings: (id: string) => [...auditKeys.all, id, 'findings'] as const,
};

function useAudits() {
  return useQuery({
    queryKey: auditKeys.list(),
    queryFn: () => apiClient.get<ComplianceAudit[]>('/compliance/audits'),
  });
}

function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceAudit>) =>
      apiClient.post<ComplianceAudit>('/compliance/audits', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: auditKeys.all }); },
  });
}

function useUpdateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ComplianceAudit> & { id: string }) =>
      apiClient.put<ComplianceAudit>(`/compliance/audits/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: auditKeys.all }); },
  });
}

function useAuditFindings(auditId: string) {
  return useQuery({
    queryKey: auditKeys.findings(auditId),
    queryFn: () => apiClient.get<AuditFinding[]>(`/compliance/audits/${auditId}/findings`),
    enabled: !!auditId,
  });
}

function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ auditId, ...data }: Partial<AuditFinding> & { auditId: string }) =>
      apiClient.post<AuditFinding>(`/compliance/audits/${auditId}/findings`, data),
    onSuccess: (_d, vars) => { void qc.invalidateQueries({ queryKey: auditKeys.findings(vars.auditId) }); },
  });
}

function useUpdateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, auditId: _auditId, ...data }: Partial<AuditFinding> & { id: string; auditId: string }) =>
      apiClient.put<AuditFinding>(`/compliance/findings/${id}`, data),
    onSuccess: (_d, vars) => { void qc.invalidateQueries({ queryKey: auditKeys.findings(vars.auditId) }); },
  });
}

const AUDIT_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
const FINDING_SEVERITIES = ['critical', 'major', 'minor', 'observation'] as const;
const FINDING_STATUSES = ['open', 'in_remediation', 'resolved', 'accepted_risk'] as const;

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  major: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  observation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

// ---------------------------------------------------------------------------
// Findings sub-component
// ---------------------------------------------------------------------------

function FindingsPanel({ auditId }: { auditId: string }) {
  const { t } = useTranslation(['compliance', 'common']);
  const { data: findings } = useAuditFindings(auditId);
  const createFinding = useCreateFinding();
  const updateFinding = useUpdateFinding();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<string>('minor');
  const [description, setDescription] = useState('');
  const [findingStatus, setFindingStatus] = useState<string>('open');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [dueDate, setDueDate] = useState('');

  const findingList = findings ?? [];

  function resetFindingForm() {
    setTitle('');
    setSeverity('minor');
    setDescription('');
    setFindingStatus('open');
    setRemediationPlan('');
    setDueDate('');
    setEditingFinding(null);
  }

  function openEditFinding(f: AuditFinding) {
    setEditingFinding(f);
    setTitle(f.title);
    setSeverity(f.severity);
    setDescription(f.description ?? '');
    setFindingStatus(f.status);
    setRemediationPlan(f.remediation_plan ?? '');
    setDueDate(f.due_date ?? '');
    setDialogOpen(true);
  }

  async function handleSaveFinding() {
    if (!title.trim()) return;
    try {
      if (editingFinding) {
        await updateFinding.mutateAsync({
          id: editingFinding.id,
          auditId,
          title: title.trim(),
          severity,
          description: description.trim() || null,
          status: findingStatus,
          remediation_plan: remediationPlan.trim() || null,
          due_date: dueDate || null,
        });
        toast.success(t('compliance:audits.finding_updated'));
      } else {
        await createFinding.mutateAsync({
          auditId,
          title: title.trim(),
          severity,
          description: description.trim() || null,
          status: findingStatus,
          remediation_plan: remediationPlan.trim() || null,
          due_date: dueDate || null,
        });
        toast.success(t('compliance:audits.finding_created'));
      }
      setDialogOpen(false);
      resetFindingForm();
    } catch {
      toast.error(t('compliance:audits.save_error'));
    }
  }

  const isSaving = createFinding.isPending || updateFinding.isPending;

  return (
    <div className="ml-6 mt-1 space-y-2 pb-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {findingList.length} {t('compliance:audits.findings')}
        </span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { resetFindingForm(); setDialogOpen(true); }}>
          <Plus className="mr-1 h-3 w-3" />
          {t('compliance:audits.add_finding')}
        </Button>
      </div>
      {findingList.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => openEditFinding(f)}
        >
          <div className="flex items-center gap-2">
            <Badge className={`text-[9px] ${SEVERITY_COLORS[f.severity] ?? ''}`}>{f.severity}</Badge>
            <span>{f.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {f.due_date && (
              <span className="text-[10px] text-muted-foreground">{new Date(f.due_date).toLocaleDateString()}</span>
            )}
            <Badge variant="outline" className="text-[9px]">
              {t(`compliance:audits.finding_statuses.${f.status}`)}
            </Badge>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetFindingForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFinding ? t('compliance:audits.edit_finding') : t('compliance:audits.add_finding')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('compliance:audits.finding_title')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:audits.finding_severity')}</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FINDING_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:audits.finding_status')}</Label>
                <Select value={findingStatus} onValueChange={setFindingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FINDING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`compliance:audits.finding_statuses.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:audits.finding_description')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:audits.remediation_plan')}</Label>
              <Textarea value={remediationPlan} onChange={(e) => setRemediationPlan(e.target.value)} rows={2} placeholder={t('compliance:audits.remediation_placeholder')} />
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:audits.due_date')}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleSaveFinding()} disabled={!title.trim() || isSaving}>
              {isSaving ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditsTab() {
  const { t } = useTranslation(['compliance', 'common']);

  const { data: audits, isLoading } = useAudits();
  const createAudit = useCreateAudit();
  const updateAudit = useUpdateAudit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceAudit | null>(null);
  const [name, setName] = useState('');
  const [auditType, setAuditType] = useState('');
  const [auditor, setAuditor] = useState('');
  const [status, setStatus] = useState<string>('planned');
  const [notes, setNotes] = useState('');
  const [expandedAudits, setExpandedAudits] = useState<Set<string>>(new Set());

  const auditList = useMemo(() => {
    const raw = audits as unknown;
    return Array.isArray(raw) ? raw : (raw as { data?: ComplianceAudit[] })?.data ?? [];
  }, [audits]);

  function toggleExpand(id: string) {
    setExpandedAudits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setName('');
    setAuditType('');
    setAuditor('');
    setStatus('planned');
    setNotes('');
    setEditing(null);
  }

  function openEdit(a: ComplianceAudit) {
    setEditing(a);
    setName(a.name);
    setAuditType(a.audit_type ?? '');
    setAuditor(a.auditor ?? '');
    setStatus(a.status);
    setNotes(a.notes ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      audit_type: auditType.trim() || null,
      auditor: auditor.trim() || null,
      status,
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateAudit.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('compliance:audits.update_success'));
      } else {
        await createAudit.mutateAsync(payload);
        toast.success(t('compliance:audits.create_success'));
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('compliance:audits.save_error'));
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
              <ClipboardCheck className="h-4 w-4" />
              {t('compliance:audits.title')}
            </CardTitle>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('compliance:audits.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {auditList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('compliance:audits.empty')}</p>
              <p className="text-xs">{t('compliance:audits.empty_hint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditList.map((audit) => {
                const isOpen = expandedAudits.has(audit.id);
                return (
                  <Collapsible key={audit.id} open={isOpen} onOpenChange={() => toggleExpand(audit.id)}>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm font-medium hover:underline">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {audit.name}
                          <Badge className={`text-[10px] ml-1 ${STATUS_COLORS[audit.status] ?? ''}`}>
                            {t(`compliance:audits.statuses.${audit.status}`)}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        {audit.auditor && (
                          <span className="text-xs text-muted-foreground">{audit.auditor}</span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(audit)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t('common:actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              void exportAuditCsv(audit.id).catch(() => toast.error(t('compliance:audits.save_error')));
                            }}>
                              <FileDown className="mr-2 h-3.5 w-3.5" />
                              {t('compliance:audits.export_csv')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              void exportAuditJson(audit.id).catch(() => toast.error(t('compliance:audits.save_error')));
                            }}>
                              <FileJson className="mr-2 h-3.5 w-3.5" />
                              {t('compliance:audits.export_json')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <FindingsPanel auditId={audit.id} />
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('compliance:audits.edit') : t('compliance:audits.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('compliance:audits.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ISO 27001 Audit 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:audits.audit_type')}</Label>
                <Input value={auditType} onChange={(e) => setAuditType(e.target.value)} placeholder="internal" />
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:audits.auditor_field')}</Label>
                <Input value={auditor} onChange={(e) => setAuditor(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:audits.status_col')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`compliance:audits.statuses.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:audits.notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!name.trim() || createAudit.isPending || updateAudit.isPending}
            >
              {createAudit.isPending || updateAudit.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
