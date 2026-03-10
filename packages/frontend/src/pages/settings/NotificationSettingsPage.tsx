import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreference,
} from '@/api/notifications';

const EVENT_TYPE_ICONS: Record<string, string> = {
  ticket_assigned: 'UserPlus',
  ticket_status_changed: 'RefreshCw',
  ticket_commented: 'MessageSquare',
  sla_warning: 'Clock',
  sla_breached: 'AlertTriangle',
  ticket_escalated: 'TrendingUp',
  major_incident_declared: 'AlertOctagon',
  major_incident_resolved: 'CheckCircle',
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_ICONS);

export default function NotificationSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  async function handleToggle(eventType: string, currentEnabled: boolean) {
    if (!preferences) return;

    const updated: NotificationPreference[] = preferences.map((p) =>
      p.event_type === eventType
        ? { ...p, enabled: !currentEnabled }
        : p,
    );

    try {
      await updateMutation.mutateAsync(updated);
      toast.success(t('settings:saved'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const prefsMap = new Map(
    (preferences ?? []).map((p) => [p.event_type, p.enabled]),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            {t('settings:notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('settings:notifications.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {EVENT_TYPES.map((eventType, index) => {
            const enabled = prefsMap.get(eventType) ?? true;
            return (
              <div key={eventType}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`notif-${eventType}`}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      {enabled ? (
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {t(`settings:notifications.events.${eventType}`)}
                    </Label>
                    <p className="text-sm text-muted-foreground pl-5.5">
                      {t(`settings:notifications.events.${eventType}_hint`)}
                    </p>
                  </div>
                  <Switch
                    id={`notif-${eventType}`}
                    checked={enabled}
                    onCheckedChange={() => handleToggle(eventType, enabled)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
