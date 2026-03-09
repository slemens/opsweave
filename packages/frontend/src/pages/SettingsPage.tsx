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
} from 'lucide-react';
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
      </Tabs>
    </div>
  );
}
