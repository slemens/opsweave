import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const;

const columnColors: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  pending: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export function TicketBoardPage() {
  const { t } = useTranslation('tickets');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('board.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('board.drag_hint')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Board columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div key={column} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2.5 w-2.5 rounded-full ${columnColors[column]}`} />
              <h3 className="text-sm font-semibold">{t(`statuses.${column}`)}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                0
              </Badge>
            </div>
            <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/50 p-2">
              {/* Empty state placeholder */}
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('board.empty')}
                  </p>
                </CardContent>
              </Card>
              {/* Skeleton placeholders */}
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg opacity-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
