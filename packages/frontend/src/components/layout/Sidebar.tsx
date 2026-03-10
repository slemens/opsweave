import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Ticket,
  Server,
  GitBranch,
  BookOpen,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Building2,
  Bug,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { useSystemInfo } from '@/api/system';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { labelKey: 'nav.tickets', href: '/tickets', icon: Ticket },
  { labelKey: 'nav.assets', href: '/assets', icon: Server },
  { labelKey: 'nav.customers', href: '/customers', icon: Building2 },
  { labelKey: 'nav.workflows', href: '/workflows', icon: GitBranch },
  { labelKey: 'nav.services', href: '/services', icon: BookOpen },
  { labelKey: 'nav.compliance', href: '/compliance', icon: Shield },
  { labelKey: 'nav.known_errors', href: '/known-errors', icon: Bug },
  { labelKey: 'nav.knowledge_base', href: '/knowledge-base', icon: FileText },
  { labelKey: 'nav.monitoring', href: '/monitoring', icon: Activity },
  { labelKey: 'nav.sla_reports', href: '/reports/sla', icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
  { labelKey: 'nav.settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  // AUDIT-FIX: C-06 — Display app version in sidebar
  const { data: systemInfo } = useSystemInfo();

  const userInitials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'gap-3',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          OW
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">
            {t('app.name')}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          const linkContent = (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed && 'justify-center px-2',
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-sidebar-primary')} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {t(item.labelKey)}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2">
        <Separator className="mb-2" />

        {bottomNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);

          const linkContent = (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed && 'justify-center px-2',
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-sidebar-primary')} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {t(item.labelKey)}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}

        <Separator className="my-2" />

        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed && 'justify-center px-2',
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {user?.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          )}
        </div>

        {/* AUDIT-FIX: C-06 — Version display */}
        {systemInfo?.version && !collapsed && (
          <p className="px-3 py-1 text-[11px] text-muted-foreground/60">
            OpsWeave v{systemInfo.version}
          </p>
        )}

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'mt-1 w-full justify-center text-muted-foreground',
            !collapsed && 'justify-end',
          )}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
