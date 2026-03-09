import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

// Mock license usage data (same source as SettingsPage until API is ready)
const MOCK_USAGE = {
  assets: { current: 12, max: 50 },
  users: { current: 3, max: 5 },
};

/**
 * LicenseBanner - shows a warning banner when community edition limits
 * are close to being reached (>80% usage). Only shown to admin users.
 * Dismissible per session.
 */
export function LicenseBanner() {
  const { t } = useTranslation('settings');
  const user = useAuthStore((s) => s.user);
  const tenants = useAuthStore((s) => s.tenants);
  const tenantId = useAuthStore((s) => s.tenantId);
  const [dismissed, setDismissed] = useState(false);

  // Only show to admins
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId);
  const isAdmin =
    activeTenant?.role === 'admin' || user?.isSuperAdmin === true;

  if (!isAdmin || dismissed) {
    return null;
  }

  // Determine which resources are near their limits (>80%)
  const warnings: Array<{ key: string; current: number; max: number }> = [];

  const { assets, users } = MOCK_USAGE;
  if (assets.max > 0 && assets.current / assets.max > 0.8) {
    warnings.push({ key: 'assets_warning', current: assets.current, max: assets.max });
  }
  if (users.max > 0 && users.current / users.max > 0.8) {
    warnings.push({ key: 'users_warning', current: users.current, max: users.max });
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <div className="flex flex-1 flex-wrap items-center gap-x-1">
        {warnings.map((w, idx) => (
          <span key={w.key}>
            {t(`settings:banner.${w.key}`, {
              current: w.current,
              max: w.max,
            })}
            {idx < warnings.length - 1 ? ' ' : ''}
          </span>
        ))}
        <span className="font-medium">
          {t('settings:banner.upgrade')}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        aria-label={t('settings:banner.dismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
