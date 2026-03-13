import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useKnownErrors,
  useCreateKnownError,
  useUpdateKnownError,
  useDeleteKnownError,
  type KnownErrorWithRelations,
  type CreateKnownErrorPayload,
} from '@/api/known-errors';
import { formatDate } from '@/lib/utils';

// ─── Status Colors ───────────────────────────────────────

const statusColors: Record<string, string> = {
  identified: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  workaround_available: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

// ─── Component ───────────────────────────────────────────

export default function KnownErrorsPage() {
  const { t, i18n } = useTranslation('tickets');
  const locale = i18n.language;

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<KnownErrorWithRelations | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params: Record<string, string | number | boolean | undefined> = { page, limit: 25 };
  if (searchQuery) params.q = searchQuery;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useKnownErrors(params);
  const createMutation = useCreateKnownError();
  const updateMutation = useUpdateKnownError();
  const deleteMutation = useDeleteKnownError();

  const items = (data as { data: KnownErrorWithRelations[] })?.data ?? [];
  const total = (data as { meta?: { total: number } })?.meta?.total ?? 0;

  const handleCreate = (formData: CreateKnownErrorPayload) => {
    createMutation.mutate(formData, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const handleUpdate = (id: string, formData: Partial<CreateKnownErrorPayload>) => {
    updateMutation.mutate({ id, data: formData }, {
      onSuccess: () => setEditItem(null),
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="page-known-errors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-6 w-6 text-purple-500" />
            {t('kedb_title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('kedb_description')}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="btn-create-known-error">
          <Plus className="h-4 w-4 mr-2" />
          {t('kedb_create')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('kedb_search')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-search-known-errors"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder={t('kedb_filter_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kedb_all_statuses')}</SelectItem>
            <SelectItem value="identified">{t('kedb_status_identified')}</SelectItem>
            <SelectItem value="workaround_available">{t('kedb_status_workaround')}</SelectItem>
            <SelectItem value="resolved">{t('kedb_status_resolved')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('kedb_empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow" data-testid={`card-known-error-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{item.title}</h3>
                      <Badge className={`text-[10px] ${statusColors[item.status] ?? ''}`}>
                        {t(`kedb_status_${item.status === 'workaround_available' ? 'workaround' : item.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.symptom}</p>
                    {item.workaround && (
                      <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {t('known_error_workaround')}: {item.workaround}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      {item.problem && (
                        <Link to={`/tickets/${item.problem.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <ExternalLink className="h-3 w-3" />
                          {item.problem.ticket_number}
                        </Link>
                      )}
                      <span>{formatDate(item.created_at, locale)}</span>
                      <span>{item.creator.display_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {total > 25 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                {t('kedb_prev')}
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                {page} / {Math.ceil(total / 25)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>
                {t('kedb_next')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <KnownErrorFormDialog
        open={isCreateOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) { setIsCreateOpen(false); setEditItem(null); }
        }}
        item={editItem}
        onSubmit={(data) => {
          if (editItem) {
            handleUpdate(editItem.id, data);
          } else {
            handleCreate(data as CreateKnownErrorPayload);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
        t={t}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('kedb_delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('kedb_delete_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('kedb_cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('kedb_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Form Dialog ─────────────────────────────────────────

function KnownErrorFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isLoading,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: KnownErrorWithRelations | null;
  onSubmit: (data: Partial<CreateKnownErrorPayload>) => void;
  isLoading: boolean;
  t: (key: string) => string;
}) {
  const [title, setTitle] = useState('');
  const [symptom, setSymptom] = useState('');
  const [workaround, setWorkaround] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [status, setStatus] = useState('identified');

  // Reset form when item changes
  const resetForm = () => {
    setTitle(item?.title ?? '');
    setSymptom(item?.symptom ?? '');
    setWorkaround(item?.workaround ?? '');
    setRootCause(item?.root_cause ?? '');
    setStatus(item?.status ?? 'identified');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{item ? t('kedb_edit') : t('kedb_create')}</DialogTitle>
          <DialogDescription>{t('kedb_form_description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('kedb_field_title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('kedb_field_symptom')}</Label>
            <Textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('kedb_field_workaround')}</Label>
            <Textarea value={workaround} onChange={(e) => setWorkaround(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('kedb_field_root_cause')}</Label>
            <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('kedb_field_status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identified">{t('kedb_status_identified')}</SelectItem>
                <SelectItem value="workaround_available">{t('kedb_status_workaround')}</SelectItem>
                <SelectItem value="resolved">{t('kedb_status_resolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('kedb_cancel')}
          </Button>
          <Button
            onClick={() => onSubmit({
              title,
              symptom,
              workaround: workaround || null,
              root_cause: rootCause || null,
              status,
            })}
            disabled={!title || !symptom || isLoading}
          >
            {item ? t('kedb_save') : t('kedb_create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
