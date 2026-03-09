import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Palette,
  User,
  KeyRound,
  Building2,
  Sun,
  Moon,
  Monitor,
  Check,
  Mail,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Users,
  Tag,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
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
  useEmailConfigs,
  useCreateEmailConfig,
  useUpdateEmailConfig,
  useDeleteEmailConfig,
} from '@/api/email';
import type { EmailConfig } from '@/api/email';
import {
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '@/api/tickets';
import type { AssigneeGroup, GroupType } from '@opsweave/shared';
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
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useThemeStore, type Theme } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// ---------- Mock license data (until API is ready) ----------
interface UsageBucket {
  current: number;
  max: number;
}

interface LicenseInfo {
  edition: 'community' | 'enterprise';
  status: 'active' | 'expired' | 'none';
  expiresAt: string | null;
  usage: {
    assets: UsageBucket;
    users: UsageBucket;
    workflows: UsageBucket;
    frameworks: UsageBucket;
    monitoring: UsageBucket;
  };
}

const MOCK_LICENSE: LicenseInfo = {
  edition: 'community',
  status: 'active',
  expiresAt: null,
  usage: {
    assets: { current: 12, max: 50 },
    users: { current: 3, max: 5 },
    workflows: { current: 1, max: 3 },
    frameworks: { current: 1, max: 1 },
    monitoring: { current: 0, max: 1 },
  },
};

// ---------- Helper: usage percentage to variant ----------
function usageVariant(current: number, max: number): 'success' | 'warning' | 'danger' {
  if (max <= 0) return 'success';
  const pct = (current / max) * 100;
  if (pct >= 100) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

// ============================================================
// General Tab
// ============================================================
function GeneralTab() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:general.language')}
          </CardTitle>
          <CardDescription>
            {t('settings:general.language_hint')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={i18n.language}
            onValueChange={(lang) => i18n.changeLanguage(lang)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">{t('common:language.de')}</SelectItem>
              <SelectItem value="en">{t('common:language.en')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:general.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications" className="text-sm font-medium">
                {t('settings:general.email_notifications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('settings:general.email_notifications_hint')}
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="browser-notifications" className="text-sm font-medium">
                {t('settings:general.browser_notifications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('settings:general.browser_notifications_hint')}
              </p>
            </div>
            <Switch
              id="browser-notifications"
              checked={browserNotifications}
              onCheckedChange={setBrowserNotifications}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button>{t('common:actions.save')}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============================================================
// Appearance Tab
// ============================================================
interface ThemeCardProps {
  themeValue: Theme;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ label, icon, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-200',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card',
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          'text-sm font-medium',
          isSelected ? 'text-primary' : 'text-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function AppearanceTab() {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useThemeStore();

  const themes: Array<{ value: Theme; labelKey: string; icon: React.ReactNode }> = [
    {
      value: 'light',
      labelKey: 'settings:appearance.theme_light',
      icon: <Sun className="h-6 w-6" />,
    },
    {
      value: 'dark',
      labelKey: 'settings:appearance.theme_dark',
      icon: <Moon className="h-6 w-6" />,
    },
    {
      value: 'system',
      labelKey: 'settings:appearance.theme_system',
      icon: <Monitor className="h-6 w-6" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('settings:appearance.theme')}
        </CardTitle>
        <CardDescription>
          {t('settings:appearance.theme_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((item) => (
            <ThemeCard
              key={item.value}
              themeValue={item.value}
              label={t(item.labelKey)}
              icon={item.icon}
              isSelected={theme === item.value}
              onSelect={() => setTheme(item.value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Account Tab
// ============================================================
function AccountTab() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useAuthStore((s) => s.user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:account.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">
              {t('settings:account.display_name')}
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t('settings:account.email')}
            </Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button>{t('settings:account.save_profile')}</Button>
        </CardFooter>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:account.change_password')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              {t('settings:account.current_password')}
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">
              {t('settings:account.new_password')}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t('settings:account.confirm_password')}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button variant="outline">
            {t('settings:account.save_password')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============================================================
// License Tab
// ============================================================
interface UsageMeterProps {
  label: string;
  current: number;
  max: number;
  ofLabel: string;
  unlimitedLabel: string;
}

function UsageMeter({ label, current, max, ofLabel, unlimitedLabel }: UsageMeterProps) {
  const isUnlimited = max < 0;
  const pct = isUnlimited ? 0 : max === 0 ? 100 : (current / max) * 100;
  const variant = isUnlimited ? 'success' : usageVariant(current, max);
  const displayMax = isUnlimited ? unlimitedLabel : String(max);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current} {ofLabel} {displayMax}
        </span>
      </div>
      <Progress value={pct} variant={variant} height={8} />
    </div>
  );
}

function LicenseTab() {
  const { t } = useTranslation(['settings', 'common']);
  const [licenseKey, setLicenseKey] = useState('');

  const license = MOCK_LICENSE;
  const isEnterprise = license.edition === 'enterprise';

  const usageItems: Array<{
    labelKey: string;
    current: number;
    max: number;
  }> = [
    { labelKey: 'settings:license.assets', current: license.usage.assets.current, max: license.usage.assets.max },
    { labelKey: 'settings:license.users', current: license.usage.users.current, max: license.usage.users.max },
    { labelKey: 'settings:license.workflows', current: license.usage.workflows.current, max: license.usage.workflows.max },
    { labelKey: 'settings:license.frameworks', current: license.usage.frameworks.current, max: license.usage.frameworks.max },
    { labelKey: 'settings:license.monitoring', current: license.usage.monitoring.current, max: license.usage.monitoring.max },
  ];

  return (
    <div className="space-y-6">
      {/* Edition & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:license.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('settings:license.edition')}
              </p>
              <Badge variant={isEnterprise ? 'default' : 'secondary'} className="text-sm">
                {isEnterprise
                  ? t('settings:license.enterprise')
                  : t('settings:license.community')}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('settings:license.status')}
              </p>
              <Badge
                variant={
                  license.status === 'active'
                    ? 'success'
                    : license.status === 'expired'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-sm"
              >
                {license.status === 'active'
                  ? t('settings:license.active')
                  : license.status === 'expired'
                    ? t('settings:license.expired')
                    : t('settings:license.no_license')}
              </Badge>
            </div>
            {license.expiresAt && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  {t('settings:license.expires_at')}
                </p>
                <p className="text-sm font-medium">{license.expiresAt}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:license.usage')}
          </CardTitle>
          {!isEnterprise && (
            <CardDescription>
              {t('settings:license.upgrade_hint')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {usageItems.map((item) => (
            <UsageMeter
              key={item.labelKey}
              label={t(item.labelKey)}
              current={item.current}
              max={item.max}
              ofLabel={t('settings:license.of')}
              unlimitedLabel={t('settings:license.unlimited')}
            />
          ))}
        </CardContent>
      </Card>

      {/* Activate License */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:license.activate')}
          </CardTitle>
          <CardDescription>
            {t('settings:license.activate_hint')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license-key">
              {t('settings:license.license_key')}
            </Label>
            <Textarea
              id="license-key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="min-h-[100px] font-mono text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button disabled={!licenseKey.trim()}>
            {t('settings:license.activate')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============================================================
// Tenant / Organization Tab
// ============================================================
function TenantTab() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useAuthStore((s) => s.user);
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
        <Button>{t('settings:tenant.save')}</Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// ============================================================
// Email Tab
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

function EmailTab() {
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
        <Button size="sm" onClick={openCreate}>
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
          <table className="w-full text-sm">
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
                        <Button variant="ghost" size="icon" className="h-7 w-7">
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
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editing ? t('dialogs.edit_title') : t('dialogs.create_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="dark:text-slate-300">{t('fields.name')}</Label>
              <Input
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
                  <Input type="password" value={form.imap_password} onChange={e => setForm(f => ({ ...f, imap_password: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder={editing ? '(unverändert)' : ''} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="dark:text-slate-300">{t('fields.is_active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              {tCommon('cancel')}
            </Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createConfig.isPending || updateConfig.isPending}>
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
// Groups Tab
// ============================================================

const BLANK_GROUP_FORM = {
  name: '',
  description: '',
  group_type: 'support' as GroupType,
};

function GroupsTab() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: groupsData, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssigneeGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssigneeGroup | null>(null);
  const [form, setForm] = useState({ ...BLANK_GROUP_FORM });

  const groups = groupsData?.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_GROUP_FORM });
    setDialogOpen(true);
  }

  function openEdit(g: AssigneeGroup) {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description ?? '',
      group_type: g.group_type,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...form });
        toast.success(tCommon('saved'));
      } else {
        await createGroup.mutateAsync(form);
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
      await deleteGroup.mutateAsync(deleteTarget.id);
      toast.success(tCommon('deleted'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setDeleteTarget(null);
    }
  }

  const GROUP_TYPES: GroupType[] = ['support', 'management', 'development', 'operations'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:groups.title')}</CardTitle>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings:groups.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:groups.empty')}</p>
            <p className="text-xs mt-1">{t('settings:groups.empty_hint')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:groups.name')}</TableHead>
                <TableHead>{t('settings:groups.type')}</TableHead>
                <TableHead>{t('settings:groups.description')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {t(`settings:groups.types.${g.group_type}`, { defaultValue: g.group_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {g.description ?? <span className="italic">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(g)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(g)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:groups.edit') : t('settings:groups.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:groups.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Support Team"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:groups.type')}</Label>
              <Select value={form.group_type} onValueChange={v => setForm(f => ({ ...f, group_type: v as GroupType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map(gt => (
                    <SelectItem key={gt} value={gt}>
                      {t(`settings:groups.types.${gt}`, { defaultValue: gt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:groups.description')}</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createGroup.isPending || updateGroup.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings:groups.delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void handleDelete(); }} className="bg-red-600 hover:bg-red-700">{tCommon('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================
// Customers Tab
// ============================================================

interface CustomerFormData {
  name: string;
  industry: string;
  contact_email: string;
  is_active: boolean;
}

const BLANK_CUSTOMER_FORM: CustomerFormData = {
  name: '',
  industry: '',
  contact_email: '',
  is_active: true,
};

interface CustomerRow {
  id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  is_active: number;
}

function CustomersTab() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: customersData, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormData>({ ...BLANK_CUSTOMER_FORM });

  const customers = (customersData?.data ?? []) as CustomerRow[];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_CUSTOMER_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: CustomerRow) {
    setEditing(c);
    setForm({
      name: c.name,
      industry: c.industry ?? '',
      contact_email: c.contact_email ?? '',
      is_active: c.is_active === 1,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      industry: form.industry.trim() || null,
      contact_email: form.contact_email.trim() || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, ...payload });
        toast.success(tCommon('saved'));
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:customers.title')}</CardTitle>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings:customers.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:customers.empty')}</p>
            <p className="text-xs mt-1">{t('settings:customers.empty_hint')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:customers.name')}</TableHead>
                <TableHead>{t('settings:customers.industry')}</TableHead>
                <TableHead>{t('settings:customers.email')}</TableHead>
                <TableHead>{t('settings:customers.status')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.industry ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.contact_email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={c.is_active ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-slate-500/15 text-slate-500'}>
                      {c.is_active ? t('settings:customers.active') : t('settings:customers.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:customers.edit') : t('settings:customers.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:customers.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:customers.industry')}</Label>
              <Input
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="IT"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:customers.email')}</Label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="contact@acme.com"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{t('settings:customers.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createCustomer.isPending || updateCustomer.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Categories Tab
// ============================================================

interface CategoryRow {
  id: string;
  name: string;
  applies_to: string;
  is_active: number;
}

const BLANK_CATEGORY_FORM = {
  name: '',
  applies_to: 'all',
};

function CategoriesTab() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: categoriesData, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ ...BLANK_CATEGORY_FORM });

  const categories = (categoriesData?.data ?? []) as CategoryRow[];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_CATEGORY_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: CategoryRow) {
    setEditing(c);
    setForm({ name: c.name, applies_to: c.applies_to });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, ...form });
        toast.success(tCommon('saved'));
      } else {
        await createCategory.mutateAsync(form);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  const APPLIES_OPTIONS = ['all', 'incident', 'problem', 'change'] as const;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:categories.title')}</CardTitle>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings:categories.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:categories.empty')}</p>
            <p className="text-xs mt-1">{t('settings:categories.empty_hint')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:categories.name')}</TableHead>
                <TableHead>{t('settings:categories.applies_to')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`settings:categories.applies_options.${c.applies_to}`, { defaultValue: c.applies_to })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:categories.edit') : t('settings:categories.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:categories.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Hardware"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:categories.applies_to')}</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {t(`settings:categories.applies_options.${opt}`, { defaultValue: opt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createCategory.isPending || updateCategory.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Main Settings Page
// ============================================================
export function SettingsPage() {
  const { t } = useTranslation('settings');

  const tabs = [
    { value: 'general', icon: Settings },
    { value: 'appearance', icon: Palette },
    { value: 'account', icon: User },
    { value: 'license', icon: KeyRound },
    { value: 'tenant', icon: Building2 },
    { value: 'email', icon: Mail },
    { value: 'groups', icon: Users },
    { value: 'customers', icon: Briefcase },
    { value: 'categories', icon: Tag },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t('settings:title')}
        </h2>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1">
          {tabs.map(({ value, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-2 px-4 py-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t(`settings:tabs.${value}`)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab />
        </TabsContent>

        <TabsContent value="license">
          <LicenseTab />
        </TabsContent>

        <TabsContent value="tenant">
          <TenantTab />
        </TabsContent>

        <TabsContent value="email">
          <EmailTab />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
