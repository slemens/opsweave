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
  Server,
  Shield,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSlaDefinitions,
  useCreateSlaDefinition,
  useUpdateSlaDefinition,
  useDeleteSlaDefinition,
  useSlaAssignments,
  useCreateSlaAssignment,
  useDeleteSlaAssignment,
} from '@/api/sla';
import type { SlaDefinition } from '@/api/sla';
import {
  useLicenseInfo,
  useLicenseUsage,
  useActivateLicense,
  useDeactivateLicense,
  useRuntimeConfig,
} from '@/api/settings';
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
// AUDIT-FIX: M-09 — Import from domain-specific API modules
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/api/groups';
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/api/customers';
import {
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
import { useChangePassword } from '@/api/auth';
import { cn } from '@/lib/utils';

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
// AUDIT-FIX: H-07 — Wire up password change form
function AccountTab() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useAuthStore((s) => s.user);
  const changePasswordMutation = useChangePassword();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleChangePassword() {
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError(t('settings:account.password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings:account.password_mismatch'));
      return;
    }
    if (!currentPassword) {
      setPasswordError(t('settings:account.current_password_required'));
      return;
    }

    changePasswordMutation.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          toast.success(t('settings:account.password_changed'));
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 401 || status === 403) {
            setPasswordError(t('settings:account.wrong_current_password'));
          } else {
            setPasswordError(t('settings:account.password_change_error'));
          }
        },
      },
    );
  }

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
            <p className="text-xs text-muted-foreground">{t('settings:account.password_hint')}</p>
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
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button
            variant="outline"
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          >
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

  const { data: license, isLoading: licenseLoading } = useLicenseInfo();
  const { data: usage, isLoading: usageLoading } = useLicenseUsage();
  const activateMutation = useActivateLicense();
  const deactivateMutation = useDeactivateLicense();

  const isEnterprise = license?.edition === 'enterprise';
  const isLoading = licenseLoading || usageLoading;

  const usageItems: Array<{
    labelKey: string;
    current: number;
    max: number;
  }> = usage
    ? [
        { labelKey: 'settings:license.assets', current: usage.assets.current, max: usage.assets.max },
        { labelKey: 'settings:license.users', current: usage.users.current, max: usage.users.max },
        { labelKey: 'settings:license.workflows', current: usage.workflows.current, max: usage.workflows.max },
        { labelKey: 'settings:license.frameworks', current: usage.frameworks.current, max: usage.frameworks.max },
        { labelKey: 'settings:license.monitoring', current: usage.monitoring.current, max: usage.monitoring.max },
      ]
    : [];

  async function handleActivate() {
    if (!licenseKey.trim()) return;
    try {
      await activateMutation.mutateAsync(licenseKey.trim());
      toast.success(t('settings:license.activated_success'));
      setLicenseKey('');
    } catch {
      toast.error(t('settings:license.activated_error'));
    }
  }

  async function handleDeactivate() {
    try {
      await deactivateMutation.mutateAsync();
      toast.success(t('settings:license.deactivated_success'));
    } catch {
      toast.error(t('common:error'));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="h-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
                  license?.status === 'active'
                    ? 'success'
                    : license?.status === 'expired'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-sm"
              >
                {license?.status === 'active'
                  ? t('settings:license.active')
                  : license?.status === 'expired'
                    ? t('settings:license.expired')
                    : t('settings:license.no_license')}
              </Badge>
            </div>
            {license?.subject && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t('settings:license.licensed_to')}
                </p>
                <p className="text-sm font-medium">{license.subject}</p>
              </div>
            )}
            {license?.expiresAt && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t('settings:license.expires_at')}
                </p>
                <p className="text-sm font-medium">
                  {new Date(license.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        {isEnterprise && (
          <CardFooter className="justify-end border-t pt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {t('settings:license.deactivate')}
            </Button>
          </CardFooter>
        )}
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

      {/* Enterprise Features */}
      {isEnterprise && license?.features && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('settings:license.features')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(license.features).map(([key, enabled]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                    enabled
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {enabled ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                  {t(`settings:license.feature_${key}`)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activate License */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isEnterprise
              ? t('settings:license.update_license')
              : t('settings:license.activate')}
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
          <Button
            disabled={!licenseKey.trim() || activateMutation.isPending}
            onClick={handleActivate}
          >
            {activateMutation.isPending
              ? t('common:status.loading')
              : t('settings:license.activate')}
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

// ============================================================
// SLA Tab
// ============================================================

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function SlaTab() {
  const { t } = useTranslation(['settings', 'common']);

  // ── State ──
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<SlaDefinition | null>(null);
  const [defName, setDefName] = useState('');
  const [defDescription, setDefDescription] = useState('');
  const [defResponseMin, setDefResponseMin] = useState(60);
  const [defResolutionMin, setDefResolutionMin] = useState(240);
  const [defBusinessHours, setDefBusinessHours] = useState<'24/7' | 'business' | 'extended'>('24/7');
  const [defBhStart, setDefBhStart] = useState('08:00');
  const [defBhEnd, setDefBhEnd] = useState('18:00');
  const [defIsDefault, setDefIsDefault] = useState(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDefId, setAssignDefId] = useState('');
  const [assignScopeType, setAssignScopeType] = useState<'service' | 'customer' | 'asset'>('customer');
  const [assignScopeId, setAssignScopeId] = useState('');

  // ── Data ──
  const { data: definitions, isLoading: defsLoading } = useSlaDefinitions();
  const { data: assignments, isLoading: assignLoading } = useSlaAssignments();
  const createDef = useCreateSlaDefinition();
  const updateDef = useUpdateSlaDefinition();
  const deleteDef = useDeleteSlaDefinition();
  const createAssign = useCreateSlaAssignment();
  const deleteAssign = useDeleteSlaAssignment();

  // Need services, customers, assets for assignment dropdown
  const { data: customersData } = useCustomers();
  const customerList = customersData?.data ?? [];

  const defList = definitions ?? [];
  const assignList = assignments ?? [];

  // ── Handlers ──

  function resetDefForm() {
    setDefName('');
    setDefDescription('');
    setDefResponseMin(60);
    setDefResolutionMin(240);
    setDefBusinessHours('24/7');
    setDefBhStart('08:00');
    setDefBhEnd('18:00');
    setDefIsDefault(false);
    setEditingDef(null);
  }

  function openEditDef(def: SlaDefinition) {
    setEditingDef(def);
    setDefName(def.name);
    setDefDescription(def.description ?? '');
    setDefResponseMin(def.response_time_minutes);
    setDefResolutionMin(def.resolution_time_minutes);
    setDefBusinessHours(def.business_hours);
    setDefBhStart(def.business_hours_start ?? '08:00');
    setDefBhEnd(def.business_hours_end ?? '18:00');
    setDefIsDefault(!!def.is_default);
    setDefDialogOpen(true);
  }

  async function handleSaveDef() {
    if (!defName.trim()) return;
    const payload = {
      name: defName.trim(),
      description: defDescription.trim() || null,
      response_time_minutes: defResponseMin,
      resolution_time_minutes: defResolutionMin,
      business_hours: defBusinessHours,
      business_hours_start: defBusinessHours !== '24/7' ? defBhStart : null,
      business_hours_end: defBusinessHours !== '24/7' ? defBhEnd : null,
      is_default: defIsDefault,
    };
    try {
      if (editingDef) {
        await updateDef.mutateAsync({ id: editingDef.id, ...payload });
        toast.success(t('settings:sla.update_success'));
      } else {
        await createDef.mutateAsync(payload);
        toast.success(t('settings:sla.create_success'));
      }
      setDefDialogOpen(false);
      resetDefForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteDef(id: string) {
    try {
      await deleteDef.mutateAsync(id);
      toast.success(t('settings:sla.delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleCreateAssign() {
    if (!assignDefId || !assignScopeId) return;
    const payload = {
      sla_definition_id: assignDefId,
      service_id: assignScopeType === 'service' ? assignScopeId : null,
      customer_id: assignScopeType === 'customer' ? assignScopeId : null,
      asset_id: assignScopeType === 'asset' ? assignScopeId : null,
    };

    try {
      await createAssign.mutateAsync(payload);
      toast.success(t('settings:sla.assignment_success'));
      setAssignDialogOpen(false);
      setAssignDefId('');
      setAssignScopeId('');
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteAssign(id: string) {
    try {
      await deleteAssign.mutateAsync(id);
      toast.success(t('settings:sla.assignment_delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (defsLoading || assignLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="h-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Definitions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('settings:sla.title')}
              </CardTitle>
              <CardDescription>{t('settings:sla.description')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetDefForm(); setDefDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:sla.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {defList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:sla.empty')}</p>
              <p className="text-xs">{t('settings:sla.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:sla.name')}</TableHead>
                    <TableHead>{t('settings:sla.response_time')}</TableHead>
                    <TableHead>{t('settings:sla.resolution_time')}</TableHead>
                    <TableHead>{t('settings:sla.business_hours')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defList.map((def) => (
                    <TableRow key={def.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {def.name}
                          {!!def.is_default && (
                            <Badge variant="secondary" className="text-[10px]">
                              {t('settings:sla.is_default')}
                            </Badge>
                          )}
                          {!def.is_active && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {t('common:status.inactive')}
                            </Badge>
                          )}
                        </div>
                        {def.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatMinutes(def.response_time_minutes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatMinutes(def.resolution_time_minutes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {t(`settings:sla.business_hours_${def.business_hours.replace('/', '_')}`)}
                        </span>
                        {def.business_hours !== '24/7' && def.business_hours_start && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({def.business_hours_start}–{def.business_hours_end})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDef(def)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t('common:actions.edit')}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {t('common:actions.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('settings:sla.delete_confirm')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteDef(def.id)}>
                                    {t('common:actions.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('settings:sla.assignments_title')}</CardTitle>
              <CardDescription>{t('settings:sla.assignments_description')}</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
              disabled={defList.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:sla.create_assignment')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignList.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {t('settings:sla.no_assignments')}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:sla.name')}</TableHead>
                    <TableHead>{t('settings:sla.scope')}</TableHead>
                    <TableHead>{t('settings:sla.priority_label')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignList.map((a) => {
                    const scopeParts: string[] = [];
                    if (a.asset_name) scopeParts.push(`${t('settings:sla.scope_asset')}: ${a.asset_name}`);
                    if (a.customer_name) scopeParts.push(`${t('settings:sla.scope_customer')}: ${a.customer_name}`);
                    if (a.service_name) scopeParts.push(`${t('settings:sla.scope_service')}: ${a.service_name}`);
                    const scopeLabel = scopeParts.join(' + ') || '—';

                    // Find the definition name
                    const def = defList.find((d) => d.id === a.sla_definition_id);

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{def?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm">{scopeLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">{a.priority}</Badge>
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
                                <AlertDialogDescription>
                                  {t('settings:sla.delete_assignment_confirm')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAssign(a.id)}>
                                  {t('common:actions.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Definition Dialog */}
      <Dialog open={defDialogOpen} onOpenChange={(open) => { setDefDialogOpen(open); if (!open) resetDefForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingDef ? t('settings:sla.edit') : t('settings:sla.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:sla.name')}</Label>
              <Input value={defName} onChange={(e) => setDefName(e.target.value)} placeholder="z.B. Gold 24/7" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:sla.description_field')}</Label>
              <Input value={defDescription} onChange={(e) => setDefDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('settings:sla.response_time')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={1} value={defResponseMin} onChange={(e) => setDefResponseMin(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('settings:sla.resolution_time')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={1} value={defResolutionMin} onChange={(e) => setDefResolutionMin(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:sla.business_hours')}</Label>
              <Select value={defBusinessHours} onValueChange={(v) => setDefBusinessHours(v as '24/7' | 'business' | 'extended')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24/7">{t('settings:sla.business_hours_24_7')}</SelectItem>
                  <SelectItem value="business">{t('settings:sla.business_hours_business')}</SelectItem>
                  <SelectItem value="extended">{t('settings:sla.business_hours_extended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {defBusinessHours !== '24/7' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.business_hours_start')}</Label>
                  <Input type="time" value={defBhStart} onChange={(e) => setDefBhStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.business_hours_end')}</Label>
                  <Input type="time" value={defBhEnd} onChange={(e) => setDefBhEnd(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sla-default"
                checked={defIsDefault}
                onChange={(e) => setDefIsDefault(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="sla-default" className="text-sm font-normal">
                {t('settings:sla.is_default')}
                <span className="text-muted-foreground ml-1 text-xs">— {t('settings:sla.is_default_hint')}</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleSaveDef} disabled={!defName.trim() || createDef.isPending || updateDef.isPending}>
              {createDef.isPending || updateDef.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('settings:sla.create_assignment')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:sla.name')}</Label>
              <Select value={assignDefId} onValueChange={setAssignDefId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {defList.filter((d) => !!d.is_active).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({formatMinutes(d.response_time_minutes)} / {formatMinutes(d.resolution_time_minutes)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:sla.scope')}</Label>
              <Select value={assignScopeType} onValueChange={(v) => { setAssignScopeType(v as 'service' | 'customer' | 'asset'); setAssignScopeId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t('settings:sla.scope_customer')}</SelectItem>
                  <SelectItem value="asset">{t('settings:sla.scope_asset')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t(`settings:sla.scope_${assignScopeType}`)}</Label>
              {assignScopeType === 'customer' ? (
                <Select value={assignScopeId} onValueChange={setAssignScopeId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Asset UUID"
                  value={assignScopeId}
                  onChange={(e) => setAssignScopeId(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={handleCreateAssign}
              disabled={!assignDefId || !assignScopeId || createAssign.isPending}
            >
              {createAssign.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// System / Runtime Tab
// ============================================================
function SystemTab() {
  const { t } = useTranslation(['settings', 'common']);
  const { data: runtime, isLoading } = useRuntimeConfig();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-40 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!runtime) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common:error')}
        </CardContent>
      </Card>
    );
  }

  const items: Array<{ label: string; value: string; badge?: boolean; variant?: 'default' | 'secondary' | 'outline' }> = [
    { label: t('settings:system.node_env'), value: runtime.nodeEnv, badge: true, variant: runtime.nodeEnv === 'production' ? 'default' : 'secondary' },
    { label: t('settings:system.port'), value: String(runtime.port) },
    { label: t('settings:system.db_driver'), value: runtime.dbDriver, badge: true },
    { label: t('settings:system.queue_driver'), value: runtime.queueDriver, badge: true },
    { label: t('settings:system.default_language'), value: runtime.defaultLanguage },
    { label: t('settings:system.cors_origin'), value: runtime.corsOrigin },
    { label: t('settings:system.serve_static'), value: runtime.serveStatic ? t('settings:system.yes') : t('settings:system.no') },
    { label: t('settings:system.oidc_enabled'), value: runtime.oidcEnabled ? t('settings:system.yes') : t('settings:system.no') },
    { label: t('settings:system.jwt_expires_in'), value: runtime.jwtExpiresIn },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-4 w-4" />
          {t('settings:system.title')}
        </CardTitle>
        <CardDescription>
          {t('settings:system.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              {item.badge ? (
                <Badge variant={item.variant ?? 'outline'} className="font-mono text-xs">
                  {item.value}
                </Badge>
              ) : (
                <span className="text-sm font-medium font-mono">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
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
    { value: 'sla', icon: Clock },
    { value: 'system', icon: Server },
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

        <TabsContent value="sla">
          <SlaTab />
        </TabsContent>

        <TabsContent value="system">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
