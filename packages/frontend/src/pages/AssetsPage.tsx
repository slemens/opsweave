import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AssetsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('nav.assets')}</h2>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('actions.create')}
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={`${t('actions.search')}...`}
            className="pl-8"
          />
        </div>
        <Button variant="outline">{t('actions.filter')}</Button>
      </div>

      {/* Placeholder table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('nav.assets')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
            <span className="w-48">Name</span>
            <span className="w-32">Type</span>
            <span className="w-28">Status</span>
            <span className="w-36">IP</span>
            <span className="flex-1">SLA</span>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
