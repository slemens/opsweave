import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useEmailConfigs,
  useCreateEmailConfig,
  useUpdateEmailConfig,
  useDeleteEmailConfig,
} from '@/api/email';
import type { EmailConfig } from '@/api/email';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { useAuthStore } from '@/stores/auth-store';
import { usePasswordPolicy, useUpdatePasswordPolicy } from '@/api/password-policy';
import type { PasswordPolicy } from '@/api/password-policy';

// ============================================================
// Tenant Section
// ============================================================
function TenantSection() {
  const { t } = useTranslation(['settings', 'common']);
  const tenants = useAuthStore((s) => s.tenants);
  const tenantId = useAuthStore((s) => s.tenantId);

  const activeTenant = tenants.find((tenant) => tenant.id === tenantId);
  const [tenantName, setTenantName] = useState(activeTenant?.name ?? '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('settings:tenant.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">
            {t('settings:tenant.name')}
          </Label>
          <Input
            id="tenant-name"
            data-testid="input-tenant-name"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-slug">
            {t('settings:tenant.slug')}
          </Label>
          <Input
            id="tenant-slug"
            data-testid="input-tenant-slug"
            value={activeTenant?.slug ?? ''}
            readOnly
            disabled
            className="max-w-md"
          />
        </div>
        <div className="space-y-2">
          <Label>
            {t('settings:tenant.members')}
          </Label>
          <p className="text-sm text-muted-foreground">
            {tenants.length}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
        <Button data-testid="btn-save-tenant">{t('settings:tenant.save')}</Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// Email Section
// ============================================================
const BLANK_EMAIL_FORM = {
  name: '',
  provider: 'imap' as EmailConfig['provider'],
  default_ticket_type: 'incident' as EmailConfig['default_ticket_type'],
  is_active: true,
  imap_host: '',
  imap_port: '993',
  imap_user: '',
  imap_password: '',
  imap_tls: true,
};

function EmailSection() {
  const { t } = useTranslation('email');
  const { t: tCommon } = useTranslation('common');
  const { data: configsRes, isLoading } = useEmailConfigs();
  const createConfig = useCreateEmailConfig();
  const updateConfig = useUpdateEmailConfig();
  const deleteConfig = useDeleteEmailConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailConfig | null>(null);
  const [form, setForm] = useState({ ...BLANK_EMAIL_FORM });

  const configs = (configsRes as unknown as { data: EmailConfig[] } | undefined)?.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_EMAIL_FORM });
    setDialogOpen(true);
  }

  function openEdit(cfg: EmailConfig) {
    setEditing(cfg);
    const c = cfg.config as Record<string, unknown>;
    setForm({
      name: cfg.name,
      provider: cfg.provider,
      default_ticket_type: cfg.default_ticket_type,
      is_active: cfg.is_active === 1,
      imap_host: (c['host'] as string) ?? '',
      imap_port: String(c['port'] ?? 993),
      imap_user: (c['user'] as string) ?? '',
      imap_password: '',
      imap_tls: (c['tls'] as boolean) ?? true,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const config: Record<string, unknown> = {};
    if (form.provider === 'imap') {
      config['host'] = form.imap_host;
      config['port'] = parseInt(form.imap_port);
      config['user'] = form.imap_user;
      if (form.imap_password) config['password'] = form.imap_password;
      config['tls'] = form.imap_tls;
    }
    const payload = {
      name: form.name,
      provider: form.provider,
      default_ticket_type: form.default_ticket_type,
      is_active: form.is_active ? 1 : 0,
      config,
    };
    try {
      if (editing) {
        await updateConfig.mutateAsync({ id: editing.id, data: payload });
        tCommon('updated');
        toast.success(tCommon('updated'));
      } else {
        await createConfig.mutateAsync(payload);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteConfig.mutateAsync(deleteTarget.id);
      toast.success(tCommon('deleted'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('configs_title')}</CardTitle>
          <CardDescription className="text-sm">{t('subtitle')}</CardDescription>
        </div>
        <Button size="sm" data-testid="btn-create-email-config" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('new_config')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('no_configs')}</p>
            <p className="text-xs mt-1">{t('no_configs_hint')}</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="table-email-configs">
            <thead>
              <tr className="border-b dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="pb-2 font-medium">{t('fields.name')}</th>
                <th className="pb-2 font-medium">{t('fields.provider')}</th>
                <th className="pb-2 font-medium">{t('fields.default_ticket_type')}</th>
                <th className="pb-2 font-medium">{t('fields.is_active')}</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {configs.map(cfg => (
                <tr key={cfg.id} className="border-b dark:border-slate-700 last:border-0">
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{cfg.name}</td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-xs">{t(`providers.${cfg.provider}`)}</Badge>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-300 capitalize">{cfg.default_ticket_type}</td>
                  <td className="py-2">
                    <Badge className={cfg.is_active ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-slate-500/15 text-slate-500'}>
                      {cfg.is_active ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('common:actions.menu')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(cfg)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(cfg)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700 max-w-lg" data-testid="modal-email-config">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editing ? t('dialogs.edit_title') : t('dialogs.create_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="dark:text-slate-300">{t('fields.name')}</Label>
              <Input
                data-testid="input-email-config-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="dark:text-slate-300">{t('fields.provider')}</Label>
                <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v as EmailConfig['provider'] }))}>
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    {(['imap', 'webhook_mailgun', 'webhook_sendgrid', 'smtp_gateway'] as const).map(p => (
                      <SelectItem key={p} value={p}>{t(`providers.${p}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-slate-300">{t('fields.default_ticket_type')}</Label>
                <Select value={form.default_ticket_type} onValueChange={v => setForm(f => ({ ...f, default_ticket_type: v as EmailConfig['default_ticket_type'] }))}>
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="request">Service Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.provider === 'imap' && (
              <div className="space-y-3 rounded-lg border dark:border-slate-700 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IMAP-Konfiguration</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs dark:text-slate-300">{t('dialogs.imap_host')}</Label>
                    <Input value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="mail.example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs dark:text-slate-300">{t('dialogs.imap_port')}</Label>
                    <Input value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs dark:text-slate-300">{t('dialogs.imap_user')}</Label>
                  <Input value={form.imap_user} onChange={e => setForm(f => ({ ...f, imap_user: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="support@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs dark:text-slate-300">{t('dialogs.imap_password')}</Label>
                  <Input type="password" value={form.imap_password} onChange={e => setForm(f => ({ ...f, imap_password: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder={editing ? '(unver\u00e4ndert)' : ''} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch data-testid="input-email-config-active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="dark:text-slate-300">{t('fields.is_active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              {tCommon('cancel')}
            </Button>
            <Button data-testid="btn-save-email-config" onClick={() => { void handleSave(); }} disabled={!form.name || createConfig.isPending || updateConfig.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">{t('dialogs.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dialogs.delete_body', { name: deleteTarget?.name ?? '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void handleDelete(); }} className="bg-red-600 hover:bg-red-700">{t('dialogs.confirm_delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================
// Password Policy Section
// ============================================================
function PasswordPolicySection() {
  const { t } = useTranslation(['settings', 'common']);
  const { data: policy, isLoading } = usePasswordPolicy();
  const updatePolicy = useUpdatePasswordPolicy();

  const [form, setForm] = useState<PasswordPolicy>({
    min_length: 8,
    require_uppercase: false,
    require_lowercase: false,
    require_digit: false,
    require_special: false,
    expiry_days: 0,
    history_count: 0,
  });

  useEffect(() => {
    if (policy) {
      setForm(policy);
    }
  }, [policy]);

  async function handleSave() {
    try {
      await updatePolicy.mutateAsync(form);
      toast.success(t('settings:saved'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">
              {t('settings:password_policy.title')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('settings:password_policy.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Minimum length */}
        <div className="space-y-2">
          <Label>{t('settings:password_policy.min_length')}</Label>
          <div className="flex items-center gap-4 max-w-md">
            <Input
              type="number"
              data-testid="input-password-min-length"
              value={form.min_length}
              onChange={e => setForm(f => ({ ...f, min_length: Math.max(8, Math.min(128, parseInt(e.target.value) || 8)) }))}
              min={8}
              max={128}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              {t('settings:password_policy.characters')}
            </span>
          </div>
        </div>

        {/* Complexity requirements */}
        <div className="space-y-3">
          <Label>{t('settings:password_policy.complexity')}</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                data-testid="input-require-uppercase"
                checked={form.require_uppercase}
                onCheckedChange={v => setForm(f => ({ ...f, require_uppercase: v }))}
              />
              <Label className="font-normal">{t('settings:password_policy.require_uppercase')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                data-testid="input-require-lowercase"
                checked={form.require_lowercase}
                onCheckedChange={v => setForm(f => ({ ...f, require_lowercase: v }))}
              />
              <Label className="font-normal">{t('settings:password_policy.require_lowercase')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                data-testid="input-require-digit"
                checked={form.require_digit}
                onCheckedChange={v => setForm(f => ({ ...f, require_digit: v }))}
              />
              <Label className="font-normal">{t('settings:password_policy.require_digit')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                data-testid="input-require-special"
                checked={form.require_special}
                onCheckedChange={v => setForm(f => ({ ...f, require_special: v }))}
              />
              <Label className="font-normal">{t('settings:password_policy.require_special')}</Label>
            </div>
          </div>
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label>{t('settings:password_policy.expiry_days')}</Label>
          <div className="flex items-center gap-4 max-w-md">
            <Input
              type="number"
              value={form.expiry_days}
              onChange={e => setForm(f => ({ ...f, expiry_days: parseInt(e.target.value) || 0 }))}
              min={0}
              max={365}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              {form.expiry_days === 0
                ? t('settings:password_policy.no_expiry')
                : t('settings:password_policy.days')}
            </span>
          </div>
        </div>

        {/* History */}
        <div className="space-y-2">
          <Label>{t('settings:password_policy.history_count')}</Label>
          <div className="flex items-center gap-4 max-w-md">
            <Input
              type="number"
              value={form.history_count}
              onChange={e => setForm(f => ({ ...f, history_count: parseInt(e.target.value) || 0 }))}
              min={0}
              max={24}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              {form.history_count === 0
                ? t('settings:password_policy.no_history')
                : t('settings:password_policy.remembered')}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
        <Button data-testid="btn-save-password-policy" onClick={() => { void handleSave(); }} disabled={updatePolicy.isPending}>
          {t('settings:tenant.save')}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// Combined Tenant Settings Page
// ============================================================
export default function TenantSettingsPage() {
  return (
    <div className="space-y-8" data-testid="page-tenant-settings">
      <TenantSection />
      <PasswordPolicySection />
      <EmailSection />
    </div>
  );
}
