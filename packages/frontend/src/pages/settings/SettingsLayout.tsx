import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  User,
  Building2,
  Users,
  Briefcase,
  Clock,
  Bell,
  TrendingUp,
  Shield,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNav = [
  { to: '/settings/general', icon: Settings, labelKey: 'settings:tabs.general' },
  { to: '/settings/account', icon: User, labelKey: 'settings:tabs.account' },
  { to: '/settings/tenant', icon: Building2, labelKey: 'settings:tabs.tenant' },
  { to: '/settings/users', icon: Users, labelKey: 'settings:tabs.groups' },
  { to: '/settings/customers', icon: Briefcase, labelKey: 'settings:tabs.customers' },
  { to: '/settings/sla', icon: Clock, labelKey: 'settings:tabs.sla' },
  { to: '/settings/notifications', icon: Bell, labelKey: 'settings:tabs.notifications' },
  { to: '/settings/escalation', icon: TrendingUp, labelKey: 'settings:tabs.escalation' },
  { to: '/settings/audit', icon: Shield, labelKey: 'settings:tabs.audit' },
  { to: '/settings/system', icon: Server, labelKey: 'settings:tabs.system' },
] as const;

export function SettingsLayout() {
  const { t } = useTranslation('settings');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t('settings:title')}
        </h2>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar navigation */}
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-56 md:flex-col md:overflow-x-visible">
          {settingsNav.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'whitespace-nowrap',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
