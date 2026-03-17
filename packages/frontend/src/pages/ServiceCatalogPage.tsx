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
  ArrowUp,
  ArrowDown,
  ListChecks,
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
  useVerticalCatalogs,
  useVerticalCatalog,
  useCreateVerticalCatalog,
  useDeleteVerticalCatalog,
  useAddVerticalOverride,
  useRemoveVerticalOverride,
  useServiceScopeItems,
  useCreateServiceScopeItem,
  useUpdateServiceScopeItem,
  useDeleteServiceScopeItem,
  useReorderServiceScopeItems,
} from '@/api/services';
import type { ServiceDescription, HorizontalCatalog, VerticalCatalog, ServiceScopeItem } from '@/api/services';
import { useLicenseInfo } from '@/api/settings';
import { useCustomers } from '@/api/customers';
import { ApiRequestError } from '@/api/client';

// =============================================================================
// Helpers
// =============================================================================

type DescStatus = 'draft' | 'published' | 'archived';
type CatalogStatus = 'active' | 'inactive' | 'draft';
type ScopeType = 'included' | 'excluded' | 'addon' | 'optional';

const SCOPE_TYPE_COLORS: Record<ScopeType, string> = {
  included: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  excluded: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  addon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  optional: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

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
// Scope Items Section (REQ-2.2c)
// =============================================================================

interface ScopeItemForm {
  item_description: string;
  scope_type: ScopeType;
  notes: string;
}

const BLANK_SCOPE_FORM: ScopeItemForm = {
  item_description: '',
  scope_type: 'included',
  notes: '',
};

function ScopeItemsSection({ serviceId }: { serviceId: string }) {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [editingScopeItem, setEditingScopeItem] = useState<ServiceScopeItem | null>(null);
  const [scopeForm, setScopeForm] = useState<ScopeItemForm>(BLANK_SCOPE_FORM);
  const [deletingScopeItem, setDeletingScopeItem] = useState<ServiceScopeItem | null>(null);

  const { data: scopeData, isLoading } = useServiceScopeItems(serviceId);
  const createMutation = useCreateServiceScopeItem();
  const updateMutation = useUpdateServiceScopeItem();
  const deleteMutation = useDeleteServiceScopeItem();
  const reorderMutation = useReorderServiceScopeItems();

  const scopeItems = (scopeData as ServiceScopeItem[] | undefined) ?? [];

  const groupedItems = {
    included: scopeItems.filter((i) => i.scope_type === 'included'),
    excluded: scopeItems.filter((i) => i.scope_type === 'excluded'),
    addon: scopeItems.filter((i) => i.scope_type === 'addon'),
    optional: scopeItems.filter((i) => i.scope_type === 'optional'),
  };

  const openCreateDialog = useCallback(() => {
    setEditingScopeItem(null);
    setScopeForm(BLANK_SCOPE_FORM);
    setScopeDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((item: ServiceScopeItem) => {
    setEditingScopeItem(item);
    setScopeForm({
      item_description: item.item_description,
      scope_type: item.scope_type as ScopeType,
      notes: item.notes ?? '',
    });
    setScopeDialogOpen(true);
  }, []);

  const handleScopeSave = useCallback(async () => {
    if (!scopeForm.item_description.trim()) return;
    try {
      if (editingScopeItem) {
        await updateMutation.mutateAsync({
          serviceId,
          itemId: editingScopeItem.id,
          data: {
            item_description: scopeForm.item_description.trim(),
            scope_type: scopeForm.scope_type,
            notes: scopeForm.notes.trim() || null,
          },
        });
        toast.success(tCommon('saved'));
      } else {
        await createMutation.mutateAsync({
          serviceId,
          data: {
            item_description: scopeForm.item_description.trim(),
            scope_type: scopeForm.scope_type,
            sort_order: scopeItems.length,
            notes: scopeForm.notes.trim() || null,
          },
        });
        toast.success(tCommon('saved'));
      }
      setScopeDialogOpen(false);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
    }
  }, [scopeForm, editingScopeItem, serviceId, scopeItems.length, createMutation, updateMutation, tCommon]);

  const handleScopeDelete = useCallback(async () => {
    if (!deletingScopeItem) return;
    try {
      await deleteMutation.mutateAsync({ serviceId, itemId: deletingScopeItem.id });
      toast.success(tCommon('deleted'));
      setDeletingScopeItem(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error_generic');
      toast.error(msg);
      setDeletingScopeItem(null);
    }
  }, [deletingScopeItem, serviceId, deleteMutation, tCommon]);

  const handleMoveItem = useCallback(async (item: ServiceScopeItem, direction: 'up' | 'down') => {
    const typeItems = scopeItems.filter((i) => i.scope_type === item.scope_type);
    const idx = typeItems.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= typeItems.length) return;

    // Build reordered ID list for the entire service (all types)
    const targetItem = typeItems[targetIdx];
    if (!targetItem) return;
    const reordered = [...scopeItems];
    const globalIdx = reordered.findIndex((i) => i.id === item.id);
    const globalTargetIdx = reordered.findIndex((i) => i.id === targetItem.id);
    if (globalIdx === -1 || globalTargetIdx === -1) return;
    const temp = reordered[globalIdx]!;
    reordered[globalIdx] = reordered[globalTargetIdx]!;
    reordered[globalTargetIdx] = temp;

    try {
      await reorderMutation.mutateAsync({
        serviceId,
        itemIds: reordered.map((i) => i.id),
      });
    } catch {
      // Silently fail — the UI will refresh from the server state
    }
  }, [scopeItems, serviceId, reorderMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderGroup = (type: ScopeType, items: ServiceScopeItem[]) => {
    if (items.length === 0) return null;
    const label = tCatalog(`scope.${type}`);

    return (
      <div key={type} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SCOPE_TYPE_COLORS[type]}`}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="group flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="leading-snug">{item.item_description}</p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => void handleMoveItem(item, 'up')}
                  title={tCatalog('scope.moveUp')}
                  aria-label={tCatalog('scope.moveUp')}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === items.length - 1}
                  onClick={() => void handleMoveItem(item, 'down')}
                  title={tCatalog('scope.moveDown')}
                  aria-label={tCatalog('scope.moveDown')}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => openEditDialog(item)}
                  aria-label={tCommon('actions.edit')}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => setDeletingScopeItem(item)}
                  aria-label={tCommon('actions.delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">{tCatalog('scope.title')}</h4>
          </div>
          <Button variant="outline" size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {tCatalog('scope.addItem')}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : scopeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-border rounded-lg">
            <ListChecks className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{tCatalog('scope.empty')}</p>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tCatalog('scope.addItem')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(['included', 'excluded', 'addon', 'optional'] as ScopeType[]).map((type) =>
              renderGroup(type, groupedItems[type]),
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Scope Item Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingScopeItem ? tCatalog('scope.editItem') : tCatalog('scope.addItem')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scope-desc">{tCatalog('scope.description')}</Label>
              <Textarea
                id="scope-desc"
                rows={3}
                value={scopeForm.item_description}
                onChange={(e) => setScopeForm((f) => ({ ...f, item_description: e.target.value }))}
                placeholder={tCatalog('scope.description')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scope-type">{tCatalog('scope.type')}</Label>
              <Select
                value={scopeForm.scope_type}
                onValueChange={(v) => setScopeForm((f) => ({ ...f, scope_type: v as ScopeType }))}
              >
                <SelectTrigger id="scope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">{tCatalog('scope.included')}</SelectItem>
                  <SelectItem value="excluded">{tCatalog('scope.excluded')}</SelectItem>
                  <SelectItem value="addon">{tCatalog('scope.addon')}</SelectItem>
                  <SelectItem value="optional">{tCatalog('scope.optional')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scope-notes">{tCatalog('scope.notes')}</Label>
              <Textarea
                id="scope-notes"
                rows={2}
                value={scopeForm.notes}
                onChange={(e) => setScopeForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleScopeSave()}
              disabled={isSaving || !scopeForm.item_description.trim()}
            >
              {isSaving ? tCommon('saving') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Scope Item Confirm */}
      <Dialog open={!!deletingScopeItem} onOpenChange={(open) => !open && setDeletingScopeItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tCommon('delete')}</DialogTitle>
            <DialogDescription>{tCatalog('scope.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          {deletingScopeItem && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              {deletingScopeItem.item_description}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingScopeItem(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleScopeDelete()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
              data-testid="input-service-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm" data-testid="select-service-status-filter">
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
        <Button size="sm" onClick={openCreateDialog} data-testid="btn-create-service-description">
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
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table data-testid="table-service-descriptions">
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
                              aria-label={tCommon('actions.menu')}
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="modal-service-description">
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

          {/* Scope Items Section — only shown when editing an existing service */}
          {editingDesc && (
            <ScopeItemsSection serviceId={editingDesc.id} />
          )}

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
        <DialogContent className="max-w-md" data-testid="modal-delete-service-description">
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
                aria-label={tCommon('actions.edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-60 hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => onDelete(catalog)}
                aria-label={tCommon('actions.delete')}
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
                              aria-label={tCommon('actions.remove')}
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
// Vertical Catalogs Tab
// =============================================================================

function VerticalCatalogsTab() {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  const { data: licenseInfo } = useLicenseInfo();
  const isEnterprise = licenseInfo?.edition === 'enterprise';

  const { data: catalogs, isLoading, isError, refetch } = useVerticalCatalogs();
  const { data: customersData } = useCustomers();
  const { data: horizontalCatalogsData } = useHorizontalCatalogs();
  const createMutation = useCreateVerticalCatalog();
  const deleteMutation = useDeleteVerticalCatalog();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createBaseCatalogId, setCreateBaseCatalogId] = useState('');
  const [createCustomerId, setCreateCustomerId] = useState('');
  const [createIndustry, setCreateIndustry] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  const customers = customersData?.data ?? [];
  const horizontalCatalogs = horizontalCatalogsData?.data ?? [];

  // Enterprise gate
  if (!isEnterprise) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 rounded-xl border border-dashed border-border bg-muted/20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1.5 max-w-xs">
          <p className="font-semibold text-base">{tCatalog('vertical.enterprise_only')}</p>
          <p className="text-sm text-muted-foreground">{tCatalog('vertical.upgrade_hint')}</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          Enterprise
        </Badge>
      </div>
    );
  }

  async function handleCreate() {
    if (!createName.trim() || !createBaseCatalogId) return;
    try {
      await createMutation.mutateAsync({
        name: createName.trim(),
        base_catalog_id: createBaseCatalogId,
        customer_id: createCustomerId || null,
        industry: createIndustry.trim() || null,
        description: createDescription.trim() || null,
      });
      toast.success(tCommon('created'));
      setCreateOpen(false);
      setCreateName('');
      setCreateBaseCatalogId('');
      setCreateCustomerId('');
      setCreateIndustry('');
      setCreateDescription('');
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error');
      toast.error(msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(tCommon('deleted'));
      if (detailId === id) setDetailId(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error');
      toast.error(msg);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-400">{tCommon('load_error')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tCatalog('vertical.subtitle')} — {(catalogs ?? []).length} {tCatalog('vertical.title').toLowerCase()}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {tCatalog('vertical.create')}
        </Button>
      </div>

      {/* Empty State */}
      {(!catalogs || catalogs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border bg-muted/20">
          <Layers className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{tCatalog('vertical.empty')}</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCatalog('vertical.create')}
          </Button>
        </div>
      )}

      {/* Catalog List */}
      {catalogs && catalogs.length > 0 && (
        <div className="grid gap-3">
          {catalogs.map((vc: VerticalCatalog) => (
            <Card
              key={vc.id}
              className={`cursor-pointer transition-colors hover:bg-muted/40 ${detailId === vc.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setDetailId(detailId === vc.id ? null : vc.id)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{vc.name}</span>
                    <Badge variant={vc.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {tCatalog(`statuses.${vc.status}`)}
                    </Badge>
                    {vc.override_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {vc.override_count} {tCatalog('vertical.overrides')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {vc.customer_name && <span>{tCatalog('fields.customer')}: {vc.customer_name}</span>}
                    {vc.industry && <span>{tCatalog('fields.industry')}: {vc.industry}</span>}
                    {vc.base_catalog_name && <span>{tCatalog('fields.base_catalog')}: {vc.base_catalog_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(vc.id); }}
                    aria-label={tCommon('actions.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {detailId === vc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {detailId && <VerticalCatalogDetail verticalId={detailId} />}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCatalog('vertical.create')}</DialogTitle>
            <DialogDescription>{tCatalog('vertical.create_hint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tCatalog('fields.name')}</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('fields.base_catalog')}</Label>
              <Select value={createBaseCatalogId} onValueChange={setCreateBaseCatalogId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {horizontalCatalogs.map((hc: HorizontalCatalog) => (
                    <SelectItem key={hc.id} value={hc.id}>{hc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('fields.customer')}</Label>
              <Select value={createCustomerId} onValueChange={setCreateCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {customers.map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('fields.industry')}</Label>
              <Input value={createIndustry} onChange={(e) => setCreateIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('fields.description')}</Label>
              <Textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!createName.trim() || !createBaseCatalogId || createMutation.isPending}>
              {tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Vertical Catalog Detail (overrides + effective services)
// =============================================================================

function VerticalCatalogDetail({ verticalId }: { verticalId: string }) {
  const { t: tCatalog } = useTranslation('catalog');
  const { t: tCommon } = useTranslation('common');

  const { data: catalog, isLoading } = useVerticalCatalog(verticalId);
  const { data: descriptionsData } = useServiceDescriptions({ limit: 500 });
  const addOverrideMutation = useAddVerticalOverride();
  const removeOverrideMutation = useRemoveVerticalOverride();

  const [addOverrideOpen, setAddOverrideOpen] = useState(false);
  const [origDescId, setOrigDescId] = useState('');
  const [overrideDescId, setOverrideDescId] = useState('');
  const [overrideType, setOverrideType] = useState('replace');
  const [overrideReason, setOverrideReason] = useState('');

  const descriptions = descriptionsData?.data ?? [];

  if (isLoading || !catalog) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  async function handleAddOverride() {
    if (!origDescId || !overrideDescId) return;
    try {
      await addOverrideMutation.mutateAsync({
        verticalId,
        data: {
          original_desc_id: origDescId,
          override_desc_id: overrideDescId,
          override_type: overrideType,
          reason: overrideReason.trim() || null,
        },
      });
      toast.success(tCommon('created'));
      setAddOverrideOpen(false);
      setOrigDescId('');
      setOverrideDescId('');
      setOverrideReason('');
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error');
      toast.error(msg);
    }
  }

  async function handleRemoveOverride(overrideId: string) {
    try {
      await removeOverrideMutation.mutateAsync({ verticalId, overrideId });
      toast.success(tCommon('deleted'));
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : tCommon('error');
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      {catalog.description && (
        <p className="text-sm text-muted-foreground">{catalog.description}</p>
      )}

      {/* Overrides */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{tCatalog('vertical.overrides')} ({catalog.overrides?.length ?? 0})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddOverrideOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              {tCatalog('vertical.add_override')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {(!catalog.overrides || catalog.overrides.length === 0) ? (
            <p className="text-xs text-muted-foreground py-2">{tCatalog('vertical.no_overrides')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tCatalog('vertical.original')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('vertical.override')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('vertical.type')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('vertical.reason')}</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.overrides!.map((ov) => (
                  <TableRow key={ov.id}>
                    <TableCell className="text-xs">{ov.original_code} — {ov.original_title}</TableCell>
                    <TableCell className="text-xs font-medium">{ov.override_code} — {ov.override_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{ov.override_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ov.reason ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void handleRemoveOverride(ov.id)} aria-label={tCommon('actions.delete')}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Effective Services */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{tCatalog('vertical.effective_services')} ({catalog.effective_services?.length ?? 0})</CardTitle>
          <CardDescription className="text-xs">{tCatalog('vertical.effective_hint')}</CardDescription>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {(!catalog.effective_services || catalog.effective_services.length === 0) ? (
            <p className="text-xs text-muted-foreground py-2">{tCatalog('vertical.no_services')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tCatalog('fields.code')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('fields.title')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('fields.status')}</TableHead>
                  <TableHead className="text-xs">{tCatalog('vertical.source')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.effective_services!.map((svc) => (
                  <TableRow key={svc.service_desc_id}>
                    <TableCell className="text-xs font-mono">{svc.code}</TableCell>
                    <TableCell className="text-xs">{svc.title}</TableCell>
                    <TableCell className="text-xs">{svc.status}</TableCell>
                    <TableCell>
                      {svc.is_override ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20">
                          {svc.override_type} ({svc.original_code})
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tCatalog('vertical.from_base')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog open={addOverrideOpen} onOpenChange={setAddOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCatalog('vertical.add_override')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tCatalog('vertical.original')}</Label>
              <Select value={origDescId} onValueChange={setOrigDescId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {descriptions.map((d: ServiceDescription) => (
                    <SelectItem key={d.id} value={d.id}>{d.code} — {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('vertical.override')}</Label>
              <Select value={overrideDescId} onValueChange={setOverrideDescId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {descriptions.map((d: ServiceDescription) => (
                    <SelectItem key={d.id} value={d.id}>{d.code} — {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('vertical.type')}</Label>
              <Select value={overrideType} onValueChange={setOverrideType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">{tCatalog('vertical.type_replace')}</SelectItem>
                  <SelectItem value="extend">{tCatalog('vertical.type_extend')}</SelectItem>
                  <SelectItem value="restrict">{tCatalog('vertical.type_restrict')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tCatalog('vertical.reason')}</Label>
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOverrideOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => void handleAddOverride()} disabled={!origDescId || !overrideDescId || addOverrideMutation.isPending}>
              {tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export function ServiceCatalogPage() {
  const { t: tCatalog } = useTranslation('catalog');

  return (
    <div className="space-y-5" data-testid="page-service-catalog">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{tCatalog('title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{tCatalog('descriptions.subtitle')}</p>
      </div>

      <Tabs defaultValue="descriptions" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="descriptions" className="gap-1.5 text-sm" data-testid="tab-descriptions">
            <BookOpen className="h-3.5 w-3.5" />
            {tCatalog('descriptions.title')}
          </TabsTrigger>
          <TabsTrigger value="horizontal" className="gap-1.5 text-sm" data-testid="tab-horizontal">
            <Layers className="h-3.5 w-3.5" />
            {tCatalog('horizontal.title')}
          </TabsTrigger>
          <TabsTrigger value="vertical" className="gap-1.5 text-sm" data-testid="tab-vertical">
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
