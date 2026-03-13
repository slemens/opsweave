import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  type EscalationRule,
} from '@/api/escalation';
import { useGroups } from '@/api/groups';
import { TICKET_TYPES, TICKET_PRIORITIES } from '@opsweave/shared';

export default function EscalationSettingsPage() {
  const { t } = useTranslation(['settings', 'common', 'tickets']);
  const { data: rules, isLoading } = useEscalationRules();
  const { data: groupsData } = useGroups();
  const groups = (groupsData as { data?: { id: string; name: string }[] })?.data ?? [];
  const createMutation = useCreateEscalationRule();
  const updateMutation = useUpdateEscalationRule();
  const deleteMutation = useDeleteEscalationRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [form, setForm] = useState({
    name: '',
    ticket_type: '' as string,
    priority: '' as string,
    sla_threshold_pct: 80,
    target_group_id: '',
    escalation_level: 1,
  });

  function openCreate() {
    setEditingRule(null);
    setForm({
      name: '',
      ticket_type: '',
      priority: '',
      sla_threshold_pct: 80,
      target_group_id: '',
      escalation_level: 1,
    });
    setDialogOpen(true);
  }

  function openEdit(rule: EscalationRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      ticket_type: rule.ticket_type ?? '',
      priority: rule.priority ?? '',
      sla_threshold_pct: rule.sla_threshold_pct,
      target_group_id: rule.target_group_id,
      escalation_level: rule.escalation_level,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.target_group_id) return;

    const payload = {
      name: form.name,
      ticket_type: form.ticket_type || null,
      priority: form.priority || null,
      sla_threshold_pct: form.sla_threshold_pct,
      target_group_id: form.target_group_id,
      escalation_level: form.escalation_level,
    };

    try {
      if (editingRule) {
        await updateMutation.mutateAsync({ id: editingRule.id, ...payload });
        toast.success(t('settings:escalation.update_success'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('settings:escalation.create_success'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('settings:escalation.delete_confirm'))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('settings:escalation.delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleToggleActive(rule: EscalationRule) {
    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        is_active: rule.is_active !== 1,
      });
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-escalation-settings">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                {t('settings:escalation.title')}
              </CardTitle>
              <CardDescription>
                {t('settings:escalation.description')}
              </CardDescription>
            </div>
            <Button size="sm" data-testid="btn-create-escalation" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              {t('settings:escalation.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!rules || rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">{t('settings:escalation.empty')}</p>
              <p className="text-sm text-muted-foreground">{t('settings:escalation.empty_hint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline">
                        Level {rule.escalation_level}
                      </Badge>
                      <Badge variant="secondary">
                        {rule.sla_threshold_pct}%
                      </Badge>
                      {rule.ticket_type && (
                        <Badge variant="outline">{rule.ticket_type}</Badge>
                      )}
                      {rule.priority && (
                        <Badge variant="outline">{rule.priority}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('settings:escalation.target_group')}: {groups.find((g) => g.id === rule.target_group_id)?.name ?? rule.target_group_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      data-testid={`input-escalation-active-${rule.id}`}
                      checked={rule.is_active === 1}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`btn-edit-escalation-${rule.id}`}
                      onClick={() => openEdit(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`btn-delete-escalation-${rule.id}`}
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="modal-escalation">
          <DialogHeader>
            <DialogTitle>
              {editingRule
                ? t('settings:escalation.edit')
                : t('settings:escalation.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('settings:escalation.name')}</Label>
              <Input
                data-testid="input-escalation-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings:escalation.ticket_type')}</Label>
                <Select
                  value={form.ticket_type}
                  onValueChange={(v) => setForm({ ...form, ticket_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings:escalation.ticket_type_all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('settings:escalation.ticket_type_all')}</SelectItem>
                    {TICKET_TYPES.map((tt) => (
                      <SelectItem key={tt} value={tt}>{t(`tickets:types.${tt}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('settings:escalation.priority')}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings:escalation.priority_all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('settings:escalation.priority_all')}</SelectItem>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{t(`tickets:priority.${p}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings:escalation.threshold')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.sla_threshold_pct}
                    onChange={(e) =>
                      setForm({ ...form, sla_threshold_pct: Number(e.target.value) })
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings:escalation.level')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.escalation_level}
                  onChange={(e) =>
                    setForm({ ...form, escalation_level: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('settings:escalation.target_group')}</Label>
              <Select
                value={form.target_group_id}
                onValueChange={(v) => setForm({ ...form, target_group_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              data-testid="btn-save-escalation"
              onClick={handleSave}
              disabled={
                !form.name ||
                !form.target_group_id ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
