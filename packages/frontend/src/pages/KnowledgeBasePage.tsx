import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Search,
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  Lock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useKbArticles,
  useCreateKbArticle,
  useUpdateKbArticle,
  useDeleteKbArticle,
} from '@/api/kb';
import type { KbArticle } from '@/api/kb';
import { ApiRequestError } from '@/api/client';

// =============================================================================
// Types & helpers
// =============================================================================

type ArticleStatus = 'draft' | 'published' | 'archived';
type ArticleVisibility = 'internal' | 'public';

interface ArticleForm {
  title: string;
  category: string;
  tags: string; // comma-separated
  visibility: ArticleVisibility;
  status: ArticleStatus;
  content: string;
}

const BLANK_FORM: ArticleForm = {
  title: '',
  category: '',
  tags: '',
  visibility: 'internal',
  status: 'draft',
  content: '',
};

function formFromArticle(a: KbArticle): ArticleForm {
  return {
    title: a.title,
    category: a.category ?? '',
    tags: a.tags.join(', '),
    visibility: a.visibility,
    status: a.status,
    content: a.content,
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

// =============================================================================
// Badge helpers
// =============================================================================

function VisibilityBadge({ visibility }: { visibility: ArticleVisibility }) {
  if (visibility === 'public') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Globe className="h-2.5 w-2.5" />
        <span>Öffentlich</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      <Lock className="h-2.5 w-2.5" />
      <span>Intern</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ArticleStatus }) {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Veröffentlicht
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Archiviert
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          Entwurf
        </span>
      );
  }
}

// =============================================================================
// Article dialog
// =============================================================================

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: KbArticle | null;
  formData: ArticleForm;
  setFormData: React.Dispatch<React.SetStateAction<ArticleForm>>;
  onSave: () => void;
  isSaving: boolean;
}

function ArticleDialog({
  open,
  onOpenChange,
  editing,
  formData,
  setFormData,
  onSave,
  isSaving,
}: ArticleDialogProps) {
  const { t } = useTranslation('kb');

  const tagList = formData.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {editing ? t('dialogs.edit_title') : t('dialogs.create_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="kb-title" className="dark:text-slate-300">
              {t('fields.title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="kb-title"
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder={t('fields.title')}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="kb-category" className="dark:text-slate-300">
              {t('fields.category')}
            </Label>
            <Input
              id="kb-category"
              value={formData.category}
              onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
              placeholder={t('fields.category')}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="kb-tags" className="dark:text-slate-300">
              {t('fields.tags')}
            </Label>
            <Input
              id="kb-tags"
              value={formData.tags}
              onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tagList.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs dark:bg-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Visibility + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kb-visibility" className="dark:text-slate-300">
                {t('fields.visibility')}
              </Label>
              <Select
                value={formData.visibility}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, visibility: v as ArticleVisibility }))
                }
              >
                <SelectTrigger
                  id="kb-visibility"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="internal">{t('visibility.internal')}</SelectItem>
                  <SelectItem value="public">{t('visibility.public')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-status" className="dark:text-slate-300">
                {t('fields.status')}
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, status: v as ArticleStatus }))
                }
              >
                <SelectTrigger
                  id="kb-status"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="published">{t('status.published')}</SelectItem>
                  <SelectItem value="archived">{t('status.archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="kb-content" className="dark:text-slate-300">
              {t('fields.content')}
            </Label>
            <Textarea
              id="kb-content"
              value={formData.content}
              onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
              placeholder={t('editor.placeholder')}
              rows={10}
              className="font-mono text-sm resize-y dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Abbrechen
          </Button>
          <Button onClick={onSave} disabled={isSaving || !formData.title.trim()}>
            {isSaving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main page
// =============================================================================

export function KnowledgeBasePage() {
  const { t } = useTranslation('kb');

  // ── Filter state ───────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  // ── Dialog state ───────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [formData, setFormData] = useState<ArticleForm>(BLANK_FORM);

  // ── Delete confirmation state ──────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<KbArticle | null>(null);

  // ── Data ───────────────────────────────────────────────────
  const queryParams: Record<string, unknown> = {};
  if (search.trim()) queryParams.q = search.trim();
  if (statusFilter !== 'all') queryParams.status = statusFilter;
  if (visibilityFilter !== 'all') queryParams.visibility = visibilityFilter;

  const { data, isLoading, isError, refetch } = useKbArticles(queryParams);
  const createMutation = useCreateKbArticle();
  const updateMutation = useUpdateKbArticle();
  const deleteMutation = useDeleteKbArticle();

  const articles = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  // ── Handlers ───────────────────────────────────────────────

  const openCreateDialog = useCallback(() => {
    setEditingArticle(null);
    setFormData(BLANK_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((article: KbArticle) => {
    setEditingArticle(article);
    setFormData(formFromArticle(article));
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) return;

    const tags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload: Partial<KbArticle> = {
      title: formData.title.trim(),
      category: formData.category.trim() || null,
      tags,
      visibility: formData.visibility,
      status: formData.status,
      content: formData.content,
    };

    // Auto-generate slug on create
    if (!editingArticle) {
      payload.slug = slugify(formData.title);
    }

    try {
      if (editingArticle) {
        await updateMutation.mutateAsync({ id: editingArticle.id, data: payload });
        toast.success(t('edit_article') + ' — Gespeichert');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('new_article') + ' — Erstellt');
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Ein Fehler ist aufgetreten';
      toast.error(msg);
    }
  }, [formData, editingArticle, createMutation, updateMutation, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('delete_article') + ' — Gelöscht');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Ein Fehler ist aufgetreten';
      toast.error(msg);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, t]);

  const handleTogglePublish = useCallback(
    async (article: KbArticle) => {
      const nextStatus: ArticleStatus =
        article.status === 'published' ? 'archived' : 'published';
      try {
        await updateMutation.mutateAsync({
          id: article.id,
          data: { status: nextStatus },
        });
        toast.success(
          nextStatus === 'published' ? t('publish_article') + ' — OK' : 'Archiviert',
        );
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : 'Ein Fehler ist aufgetreten';
        toast.error(msg);
      }
    },
    [updateMutation, t],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('new_article')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
            <SelectValue placeholder={t('all_statuses')} />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
            <SelectItem value="all">{t('all_statuses')}</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="published">{t('status.published')}</SelectItem>
            <SelectItem value="archived">{t('status.archived')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
            <SelectValue placeholder="Alle Sichtbarkeiten" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
            <SelectItem value="all">Alle Sichtbarkeiten</SelectItem>
            <SelectItem value="internal">{t('visibility.internal')}</SelectItem>
            <SelectItem value="public">{t('visibility.public')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      {!isLoading && !isError && (
        <p className="text-sm text-muted-foreground dark:text-slate-500 -mt-2">
          {t('article_count', { count: totalCount })}
        </p>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">Fehler beim Laden der Artikel.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <div className="rounded-lg border border-border dark:border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 dark:bg-slate-800/60 dark:hover:bg-slate-800/60">
                <TableHead className="dark:text-slate-400">{t('fields.title')}</TableHead>
                <TableHead className="w-[140px] dark:text-slate-400">
                  {t('fields.category')}
                </TableHead>
                <TableHead className="w-[200px] dark:text-slate-400">
                  {t('fields.tags')}
                </TableHead>
                <TableHead className="w-[110px] dark:text-slate-400">
                  {t('fields.visibility')}
                </TableHead>
                <TableHead className="w-[130px] dark:text-slate-400">
                  {t('fields.status')}
                </TableHead>
                <TableHead className="w-[130px] dark:text-slate-400">
                  {t('fields.author')}
                </TableHead>
                <TableHead className="w-[110px] dark:text-slate-400">
                  {t('fields.created_at')}
                </TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell>
                        <Skeleton className="h-4 w-48 dark:bg-slate-700" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24 dark:bg-slate-700" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Skeleton className="h-5 w-14 rounded-full dark:bg-slate-700" />
                          <Skeleton className="h-5 w-14 rounded-full dark:bg-slate-700" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full dark:bg-slate-700" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full dark:bg-slate-700" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24 dark:bg-slate-700" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20 dark:bg-slate-700" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : articles.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <FileText className="h-10 w-10 text-muted-foreground/40 dark:text-slate-600" />
                          <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                            {t('no_articles')}
                          </p>
                          <p className="text-xs text-muted-foreground/70 dark:text-slate-500">
                            {t('no_articles_hint')}
                          </p>
                          <Button variant="outline" size="sm" onClick={openCreateDialog}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t('new_article')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : articles.map((article) => (
                    <TableRow
                      key={article.id}
                      className="transition-colors hover:bg-muted/50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      {/* Title */}
                      <TableCell>
                        <span className="font-medium text-sm leading-tight dark:text-slate-200">
                          {article.title}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-sm text-muted-foreground dark:text-slate-400">
                        {article.category ?? '—'}
                      </TableCell>

                      {/* Tags */}
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground dark:text-slate-500">
                              +{article.tags.length - 3}
                            </span>
                          )}
                          {article.tags.length === 0 && (
                            <span className="text-xs text-muted-foreground/60 dark:text-slate-600">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Visibility */}
                      <TableCell>
                        <VisibilityBadge visibility={article.visibility} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={article.status} />
                      </TableCell>

                      {/* Author */}
                      <TableCell className="text-sm text-muted-foreground dark:text-slate-400">
                        {article.author_name ?? '—'}
                      </TableCell>

                      {/* Created at */}
                      <TableCell className="text-sm text-muted-foreground dark:text-slate-400">
                        {formatDate(article.created_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-60 hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="dark:bg-slate-800 dark:border-slate-700"
                          >
                            <DropdownMenuItem
                              className="dark:text-slate-300 dark:focus:bg-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(article);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="dark:text-slate-300 dark:focus:bg-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleTogglePublish(article);
                              }}
                            >
                              {article.status === 'published' ? (
                                <>
                                  <Lock className="mr-2 h-3.5 w-3.5" />
                                  Archivieren
                                </>
                              ) : (
                                <>
                                  <Globe className="mr-2 h-3.5 w-3.5" />
                                  {t('publish_article')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive dark:focus:bg-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(article);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              {t('delete_article')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <ArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingArticle}
        formData={formData}
        setFormData={setFormData}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              {t('dialogs.delete_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              {t('dialogs.delete_body', { name: deleteTarget?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dialogs.confirm_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
