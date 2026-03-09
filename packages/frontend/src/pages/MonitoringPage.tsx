import { useTranslation } from 'react-i18next';
import { Monitor, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MonitoringPage() {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
      <div className="rounded-full bg-blue-50 dark:bg-blue-950 p-8">
        <Monitor className="h-16 w-16 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold">{t('monitoring.title')}</h1>
          <Badge variant="secondary">
            <Wrench className="h-3 w-3 mr-1" />
            {t('monitoring.coming_soon')}
          </Badge>
        </div>
        <p className="text-muted-foreground max-w-md">{t('monitoring.description')}</p>
      </div>
    </div>
  );
}
