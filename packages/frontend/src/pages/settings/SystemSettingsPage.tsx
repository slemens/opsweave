import { useTranslation } from 'react-i18next';
import { Server } from 'lucide-react';
import { useRuntimeConfig } from '@/api/settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SystemSettingsPage() {
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
