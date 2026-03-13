import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useLicenseInfo,
  useLicenseUsage,
  useActivateLicense,
  useDeactivateLicense,
} from '@/api/settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useThemeStore, type Theme } from '@/stores/theme-store';
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
// General Section
// ============================================================
function GeneralSection() {
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
            <SelectTrigger className="w-48" data-testid="select-language">
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
              data-testid="input-email-notifications"
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
              data-testid="input-browser-notifications"
              checked={browserNotifications}
              onCheckedChange={setBrowserNotifications}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button data-testid="btn-save-general">{t('common:actions.save')}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============================================================
// Appearance Section
// ============================================================
interface ThemeCardProps {
  themeValue: Theme;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ themeValue, label, icon, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      data-testid={`btn-theme-${themeValue}`}
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

function AppearanceSection() {
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
// License Section
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

function LicenseSection() {
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
  }> = usage?.assets
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
              data-testid="btn-deactivate-license"
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
              data-testid="input-license-key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="min-h-[100px] font-mono text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button
            data-testid="btn-activate-license"
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
// Combined General Settings Page
// ============================================================
export default function GeneralSettingsPage() {
  return (
    <div className="space-y-8" data-testid="page-general-settings">
      <GeneralSection />
      <AppearanceSection />
      <LicenseSection />
    </div>
  );
}
