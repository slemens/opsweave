import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  BookOpen,
  Layers,
  Pencil,
  Trash2,
  X,
  Tag,
  Lock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useServiceDescriptions,
  useCreateServiceDescription,
  useUpdateServiceDescription,
  useDeleteServiceDescription,
  useHorizontalCatalogs,
  useHorizontalCatalog,
  useCreateHorizontalCatalog,
  useUpdateHorizontalCatalog,
  useDeleteHorizontalCatalog,
  useAddCatalogItem,
  useRemoveCatalogItem,
} from '@/api/services';
import type { ServiceDescription, HorizontalCatalog } from '@/api/services';
import { ApiRequestError } from '@/api/client';

// =============================================================================
// Helpers
// =============================================================================

type DescStatus = 'draft' | 'published' | 'archived';
type CatalogStatus = 'active' | 'inactive' | 'draft';

function descStatusBadge(status: DescStatus) {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {status}
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {status}
        </span>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          {status}
        </Badge>
      );
  }
}

function catalogStatusBadge(status: CatalogStatus) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {status}
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground bg-muted">
          {status}
        </span>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          {status}
        </Badge>
      );
  }
}

// Blank form state for service description dialog
interface DescForm {
  code: string;
  title: string;
  description: string;
  scope_included: string;
  scope_excluded: string;
  status: DescStatus;
  compliance_tags: string; // comma-separated input value
}

const BLANK_DESC_FORM: DescForm = {
  code: '',
  title: '',
  description: '',
  scope_included: '',
  scope_excluded: '',
  status: 'draft',
  compliance_tags: '',
};

function descFormFromRecord(d: ServiceDescription): DescForm {
  return {
    code: d.code,
    title: d.title,
    description: d.description,
    scope_included: d.scope_included ?? '',
    scope_excluded: d.scope_excluded ?? '',
    status: d.status,
    compliance_tags: d.compliance_tags.join(', '),
  };
}

interface CatalogForm {
  name: string;
  description: string;
  status: CatalogStatus;
}

const BLANK_CATALOG_FORM: CatalogForm = {
  name: '',
  description: '',
  status: 'active',
};

function catalogFormFromRecord(c: HorizontalCatalog): CatalogForm {
  return {
    name: c.name,
    description: c.description ?? '',
    status: c.status,
  };
}

// =============================================================================
// Service Descriptions Tab
// =============================================================================

function ServiceDescriptionsTab() {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  // ── Filter state ──────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ── Create / Edit dialog ──────────────────────────────────
  const [descDialogOpen, setDescDialogOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState<ServiceDescription | null>(null);
  const [descForm, setDescForm] = useState<DescForm>(BLANK_DESC_FORM);

  // ── Delete dialog ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ServiceDescription | null>(null);

  // ── Data ──────────────────────────────────────────────────
  const queryParams: Record<string, unknown> = {};
  if (search.trim()) queryParams.q = search.trim();
  if (statusFilter !== 'all') queryParams.status = statusFilter;

  const { data, isLoading, isError, refetch } = useServiceDescriptions(queryParams);
  const createMutation = useCreateServiceDescription();
  const updateMutation = useUpdateServiceDescription();
  const deleteMutation = useDeleteServiceDescription();

  const descriptions = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  // ── Handlers ──────────────────────────────────────────────

  const openCreateDialog = useCallback(() => {
    setEditingDesc(null);
    setDescForm(BLANK_DESC_FORM);
    setDescDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((desc: ServiceDescription) => {
    setEditingDesc(desc);
    setDescForm(descFormFromRecord(desc));
    setDescDialogOpen(true);
  }, []);

  const handleDescSave = useCallback(async () => {
    if (!descForm.code.trim() || !descForm.title.trim()) return;
    const payload = {
      code: descForm.code.trim(),
      title: descForm.title.trim(),
      description: descForm.description.trim(),
      scope_included: descForm.scope_included.trim() || null,
      scope_excluded: descForm.scope_excluded.trim() || null,
      status: descForm.status,
      compliance_tags: descForm.compliance_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (editingDesc) {
        await updateMutation.mutateAsync({ id: editingDesc.id, data: payload });
        toast.success(tCatalog('descriptions.edit') + ' — ' + tCommon('saved'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(tCatalog('descriptions.create') + ' — ' + tCommon('saved'));
      }
      setDescDialogOpen(false);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
    }
  }, [descForm, editingDesc, createMutation, updateMutation, tCatalog, tCommon]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(tCommon('deleted'));
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, tCommon]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder={tCatalog('filters.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder={tCatalog('filters.all_statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCatalog('filters.all_statuses')}</SelectItem>
              <SelectItem value="draft">{tCatalog('statuses.draft')}</SelectItem>
              <SelectItem value="published">{tCatalog('statuses.published')}</SelectItem>
              <SelectItem value="archived">{tCatalog('statuses.archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tCatalog('descriptions.create')}
        </Button>
      </div>

      {/* Count */}
      {!isLoading && !isError && (
        <p className="text-sm text-muted-foreground">
          {tCatalog('descriptions.total', { count: totalCount })}
        </p>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">{tCommon('error_load')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {tCommon('retry')}
          </Button>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[130px]">{tCatalog('fields.code')}</TableHead>
                <TableHead>{tCatalog('fields.title')}</TableHead>
                <TableHead className="w-[110px]">{tCatalog('fields.status')}</TableHead>
                <TableHead className="w-[80px] text-center">{tCatalog('fields.version')}</TableHead>
                <TableHead className="w-[130px]">{tCatalog('fields.created_at')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : descriptions.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                          <p className="text-sm font-medium text-muted-foreground">
                            {tCatalog('descriptions.empty')}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            {tCatalog('descriptions.empty_hint')}
                          </p>
                          <Button variant="outline" size="sm" onClick={openCreateDialog}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {tCatalog('descriptions.create')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : descriptions.map((desc) => (
                    <TableRow
                      key={desc.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => openEditDialog(desc)}
                    >
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground">
                          {desc.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium text-sm leading-tight truncate">
                            {desc.title}
                          </span>
                          {desc.compliance_tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              {desc.compliance_tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/20 px-1.5 py-px text-[10px] font-medium text-blue-600 dark:text-blue-400"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {desc.compliance_tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{desc.compliance_tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{descStatusBadge(desc.status)}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        v{desc.version}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                        }).format(new Date(desc.created_at))}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-60 hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(desc);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {tCommon('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(desc);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              {tCommon('delete')}
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

      {/* Create / Edit Dialog */}
      <Dialog open={descDialogOpen} onOpenChange={setDescDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDesc
                ? tCatalog('dialogs.edit_description.title')
                : tCatalog('dialogs.create_description.title')}
            </DialogTitle>
            <DialogDescription>
              {editingDesc
                ? tCatalog('dialogs.edit_description.description')
                : tCatalog('dialogs.create_description.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="desc-code">{tCatalog('fields.code')}</Label>
                <Input
                  id="desc-code"
                  value={descForm.code}
                  onChange={(e) => setDescForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="SVC-001"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc-status">{tCatalog('fields.status')}</Label>
                <Select
                  value={descForm.status}
                  onValueChange={(v) => setDescForm((f) => ({ ...f, status: v as DescStatus }))}
                >
                  <SelectTrigger id="desc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{tCatalog('statuses.draft')}</SelectItem>
                    <SelectItem value="published">{tCatalog('statuses.published')}</SelectItem>
                    <SelectItem value="archived">{tCatalog('statuses.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-title">{tCatalog('fields.title')}</Label>
              <Input
                id="desc-title"
                value={descForm.title}
                onChange={(e) => setDescForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-description">{tCatalog('fields.description')}</Label>
              <Textarea
                id="desc-description"
                rows={3}
                value={descForm.description}
                onChange={(e) => setDescForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-included">{tCatalog('fields.scope_included')}</Label>
              <Textarea
                id="desc-included"
                rows={2}
                value={descForm.scope_included}
                onChange={(e) => setDescForm((f) => ({ ...f, scope_included: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-excluded">{tCatalog('fields.scope_excluded')}</Label>
              <Textarea
                id="desc-excluded"
                rows={2}
                value={descForm.scope_excluded}
                onChange={(e) => setDescForm((f) => ({ ...f, scope_excluded: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-tags">
                {tCatalog('fields.compliance_tags')}
                <span className="ml-1.5 text-xs text-muted-foreground">(comma-separated)</span>
              </Label>
              <div className="relative">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="desc-tags"
                  className="pl-8 text-sm"
                  value={descForm.compliance_tags}
                  onChange={(e) =>
                    setDescForm((f) => ({ ...f, compliance_tags: e.target.value }))
                  }
                  placeholder="ISO27001, DSGVO, BSI-IT"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDescDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleDescSave()}
              disabled={isSaving || !descForm.code.trim() || !descForm.title.trim()}
            >
              {isSaving ? tCommon('saving') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tCommon('delete')}</DialogTitle>
            <DialogDescription>{tCatalog('dialogs.delete_confirm')}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <code className="font-mono font-semibold">{deleteTarget.code}</code>
              {' — '}
              {deleteTarget.title}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Catalog Card (expanded detail)
// =============================================================================

interface CatalogCardProps {
  catalog: HorizontalCatalog;
  onEdit: (c: HorizontalCatalog) => void;
  onDelete: (c: HorizontalCatalog) => void;
  allDescriptions: ServiceDescription[];
}

function CatalogCard({ catalog, onEdit, onDelete, allDescriptions }: CatalogCardProps) {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  const [expanded, setExpanded] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedDescId, setSelectedDescId] = useState<string>('');

  const { data: fullCatalog, isLoading: itemsLoading } = useHorizontalCatalog(
    expanded ? catalog.id : undefined,
  );
  const addItemMutation = useAddCatalogItem();
  const removeItemMutation = useRemoveCatalogItem();

  const items = fullCatalog?.items ?? [];

  // Descriptions not yet in catalog
  const currentIds = new Set(items.map((i) => i.service_desc_id));
  const publishedDescriptions = allDescriptions.filter(
    (d) => d.status === 'published' && !currentIds.has(d.id),
  );

  const handleAddItem = useCallback(async () => {
    if (!selectedDescId) return;
    try {
      await addItemMutation.mutateAsync({ catalogId: catalog.id, serviceDescId: selectedDescId });
      toast.success(tCatalog('horizontal.add_item'));
      setAddItemOpen(false);
      setSelectedDescId('');
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
    }
  }, [selectedDescId, catalog.id, addItemMutation, tCatalog, tCommon]);

  const handleRemoveItem = useCallback(
    async (serviceDescId: string) => {
      try {
        await removeItemMutation.mutateAsync({ catalogId: catalog.id, serviceDescId });
        toast.success(tCatalog('horizontal.remove_item'));
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
        toast.error(msg);
      }
    },
    [catalog.id, removeItemMutation, tCatalog, tCommon],
  );

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{catalog.name}</CardTitle>
                {catalogStatusBadge(catalog.status)}
              </div>
              {catalog.description && (
                <CardDescription className="line-clamp-2">{catalog.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-60 hover:opacity-100"
                onClick={() => onEdit(catalog)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-60 hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => onDelete(catalog)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {tCatalog('fields.items_count')}:{' '}
              <strong>{catalog.item_count ?? items.length}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  {tCommon('collapse')} <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  {tCatalog('horizontal.items')} <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {expanded && (
          <>
            <Separator />
            <CardContent className="pt-4 pb-4 space-y-3">
              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-lg border border-dashed border-border">
                  <Layers className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {tCatalog('horizontal.no_items')}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {tCatalog('horizontal.no_items_hint')}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="py-2 text-xs">{tCatalog('fields.code')}</TableHead>
                        <TableHead className="py-2 text-xs">{tCatalog('fields.title')}</TableHead>
                        <TableHead className="py-2 text-xs w-[100px]">{tCatalog('fields.status')}</TableHead>
                        <TableHead className="py-2 w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.service_desc_id} className="text-sm">
                          <TableCell className="py-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold">
                              {item.code}
                            </code>
                          </TableCell>
                          <TableCell className="py-2 font-medium">{item.title}</TableCell>
                          <TableCell className="py-2">
                            {descStatusBadge(item.status as DescStatus)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-50 hover:opacity-100 text-destructive hover:text-destructive"
                              disabled={removeItemMutation.isPending}
                              onClick={() => void handleRemoveItem(item.service_desc_id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddItemOpen(true)}
                  disabled={publishedDescriptions.length === 0}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {tCatalog('horizontal.add_item')}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tCatalog('dialogs.add_item.title')}</DialogTitle>
            <DialogDescription>{tCatalog('dialogs.add_item.description')}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>{tCatalog('dialogs.select_description')}</Label>
            <Select value={selectedDescId} onValueChange={setSelectedDescId}>
              <SelectTrigger>
                <SelectValue placeholder={tCatalog('dialogs.select_description')} />
              </SelectTrigger>
              <SelectContent>
                {publishedDescriptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{d.code}</span>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleAddItem()}
              disabled={!selectedDescId || addItemMutation.isPending}
            >
              {addItemMutation.isPending ? tCommon('saving') : tCommon('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Horizontal Catalogs Tab
// =============================================================================

function HorizontalCatalogsTab() {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  // ── Create / Edit dialog ──────────────────────────────────
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<HorizontalCatalog | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(BLANK_CATALOG_FORM);

  // ── Delete dialog ─────────────────────────────────────────
  const [deleteCatalogTarget, setDeleteCatalogTarget] = useState<HorizontalCatalog | null>(null);

  // ── Data ──────────────────────────────────────────────────
  const {
    data: catalogsData,
    isLoading: catalogsLoading,
    isError: catalogsError,
    refetch: refetchCatalogs,
  } = useHorizontalCatalogs();

  const { data: descsData } = useServiceDescriptions({});

  const createCatalogMutation = useCreateHorizontalCatalog();
  const updateCatalogMutation = useUpdateHorizontalCatalog();
  const deleteCatalogMutation = useDeleteHorizontalCatalog();

  const catalogs = catalogsData?.data ?? [];
  const allDescriptions = descsData?.data ?? [];

  // ── Handlers ──────────────────────────────────────────────

  const openCreateCatalogDialog = useCallback(() => {
    setEditingCatalog(null);
    setCatalogForm(BLANK_CATALOG_FORM);
    setCatalogDialogOpen(true);
  }, []);

  const openEditCatalogDialog = useCallback((c: HorizontalCatalog) => {
    setEditingCatalog(c);
    setCatalogForm(catalogFormFromRecord(c));
    setCatalogDialogOpen(true);
  }, []);

  const handleCatalogSave = useCallback(async () => {
    if (!catalogForm.name.trim()) return;
    const payload = {
      name: catalogForm.name.trim(),
      description: catalogForm.description.trim() || null,
      status: catalogForm.status,
    };
    try {
      if (editingCatalog) {
        await updateCatalogMutation.mutateAsync({ id: editingCatalog.id, data: payload });
        toast.success(tCatalog('horizontal.edit') + ' — ' + tCommon('saved'));
      } else {
        await createCatalogMutation.mutateAsync(payload);
        toast.success(tCatalog('horizontal.create') + ' — ' + tCommon('saved'));
      }
      setCatalogDialogOpen(false);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
    }
  }, [catalogForm, editingCatalog, createCatalogMutation, updateCatalogMutation, tCatalog, tCommon]);

  const handleDeleteCatalogConfirm = useCallback(async () => {
    if (!deleteCatalogTarget) return;
    try {
      await deleteCatalogMutation.mutateAsync(deleteCatalogTarget.id);
      toast.success(tCommon('deleted'));
      setDeleteCatalogTarget(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
      setDeleteCatalogTarget(null);
    }
  }, [deleteCatalogTarget, deleteCatalogMutation, tCommon]);

  const isCatalogSaving = createCatalogMutation.isPending || updateCatalogMutation.isPending;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tCatalog('horizontal.subtitle')}</p>
        <Button size="sm" onClick={openCreateCatalogDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          {tCatalog('horizontal.create')}
        </Button>
      </div>

      {/* Error state */}
      {catalogsError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">{tCommon('error_load')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetchCatalogs()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {tCommon('retry')}
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {catalogsLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!catalogsLoading && !catalogsError && catalogs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 gap-3">
          <Layers className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {tCatalog('horizontal.empty')}
          </p>
          <p className="text-xs text-muted-foreground/70">{tCatalog('horizontal.empty_hint')}</p>
          <Button variant="outline" size="sm" onClick={openCreateCatalogDialog}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {tCatalog('horizontal.create')}
          </Button>
        </div>
      )}

      {/* Catalog cards */}
      {!catalogsLoading && !catalogsError && catalogs.length > 0 && (
        <div className="space-y-3">
          {catalogs.map((catalog) => (
            <CatalogCard
              key={catalog.id}
              catalog={catalog}
              onEdit={openEditCatalogDialog}
              onDelete={setDeleteCatalogTarget}
              allDescriptions={allDescriptions}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Catalog Dialog */}
      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCatalog
                ? tCatalog('dialogs.edit_catalog.title')
                : tCatalog('dialogs.create_catalog.title')}
            </DialogTitle>
            <DialogDescription>
              {editingCatalog
                ? tCatalog('dialogs.edit_catalog.description')
                : tCatalog('dialogs.create_catalog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">{tCatalog('fields.name')}</Label>
              <Input
                id="cat-name"
                value={catalogForm.name}
                onChange={(e) => setCatalogForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-description">{tCatalog('fields.description')}</Label>
              <Textarea
                id="cat-description"
                rows={3}
                value={catalogForm.description}
                onChange={(e) => setCatalogForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-status">{tCatalog('fields.status')}</Label>
              <Select
                value={catalogForm.status}
                onValueChange={(v) =>
                  setCatalogForm((f) => ({ ...f, status: v as CatalogStatus }))
                }
              >
                <SelectTrigger id="cat-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{tCatalog('statuses.active')}</SelectItem>
                  <SelectItem value="inactive">{tCatalog('statuses.inactive')}</SelectItem>
                  <SelectItem value="draft">{tCatalog('statuses.draft')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleCatalogSave()}
              disabled={isCatalogSaving || !catalogForm.name.trim()}
            >
              {isCatalogSaving ? tCommon('saving') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Catalog Confirm Dialog */}
      <Dialog
        open={!!deleteCatalogTarget}
        onOpenChange={(open) => !open && setDeleteCatalogTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tCommon('delete')}</DialogTitle>
            <DialogDescription>{tCatalog('dialogs.delete_confirm')}</DialogDescription>
          </DialogHeader>
          {deleteCatalogTarget && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium">
              {deleteCatalogTarget.name}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatalogTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteCatalogConfirm()}
              disabled={deleteCatalogMutation.isPending}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Vertical Catalogs Tab (Enterprise gate)
// =============================================================================

function VerticalCatalogsTab() {
  const { t: tCatalog } = useTranslation('catalog');

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 rounded-xl border border-dashed border-border bg-muted/20">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-center space-y-1.5 max-w-xs">
        <p className="font-semibold text-base">{tCatalog('vertical.enterprise_only')}</p>
        <p className="text-sm text-muted-foreground">{tCatalog('vertical.upgrade_hint')}</p>
      </div>
      <Badge
        variant="secondary"
        className="px-3 py-1 text-xs font-semibold tracking-wide uppercase"
      >
        Enterprise
      </Badge>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export function ServiceCatalogPage() {
  const { t: tCatalog } = useTranslation('catalog');

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{tCatalog('title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{tCatalog('descriptions.subtitle')}</p>
      </div>

      <Tabs defaultValue="descriptions" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="descriptions" className="gap-1.5 text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            {tCatalog('descriptions.title')}
          </TabsTrigger>
          <TabsTrigger value="horizontal" className="gap-1.5 text-sm">
            <Layers className="h-3.5 w-3.5" />
            {tCatalog('horizontal.title')}
          </TabsTrigger>
          <TabsTrigger value="vertical" className="gap-1.5 text-sm">
            <Lock className="h-3.5 w-3.5 opacity-60" />
            {tCatalog('vertical.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="descriptions" className="mt-0">
          <ServiceDescriptionsTab />
        </TabsContent>

        <TabsContent value="horizontal" className="mt-0">
          <HorizontalCatalogsTab />
        </TabsContent>

        <TabsContent value="vertical" className="mt-0">
          <VerticalCatalogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
