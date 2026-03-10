import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Upload,
  Users,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/api/groups';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '@/api/tickets';
import type { AssigneeGroup, GroupType } from '@opsweave/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UserImportDialog from '@/pages/settings/UserImportDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================================
// Groups Section
// ============================================================

const BLANK_GROUP_FORM = {
  name: '',
  description: '',
  group_type: 'support' as GroupType,
};

function GroupsSection() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: groupsData, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<AssigneeGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssigneeGroup | null>(null);
  const [form, setForm] = useState({ ...BLANK_GROUP_FORM });

  const groups = groupsData?.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_GROUP_FORM });
    setDialogOpen(true);
  }

  function openEdit(g: AssigneeGroup) {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description ?? '',
      group_type: g.group_type,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...form });
        toast.success(tCommon('saved'));
      } else {
        await createGroup.mutateAsync(form);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteTarget.id);
      toast.success(tCommon('deleted'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setDeleteTarget(null);
    }
  }

  const GROUP_TYPES: GroupType[] = ['support', 'management', 'development', 'operations'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:groups.title')}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('settings:users.import.button')}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('settings:groups.create')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:groups.empty')}</p>
            <p className="text-xs mt-1">{t('settings:groups.empty_hint')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:groups.name')}</TableHead>
                <TableHead>{t('settings:groups.type')}</TableHead>
                <TableHead>{t('settings:groups.description')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {t(`settings:groups.types.${g.group_type}`, { defaultValue: g.group_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {g.description ?? <span className="italic">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(g)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(g)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:groups.edit') : t('settings:groups.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:groups.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Support Team"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:groups.type')}</Label>
              <Select value={form.group_type} onValueChange={v => setForm(f => ({ ...f, group_type: v as GroupType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map(gt => (
                    <SelectItem key={gt} value={gt}>
                      {t(`settings:groups.types.${gt}`, { defaultValue: gt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:groups.description')}</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createGroup.isPending || updateGroup.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings:groups.delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void handleDelete(); }} className="bg-red-600 hover:bg-red-700">{tCommon('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <UserImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </Card>
  );
}

// ============================================================
// Categories Section
// ============================================================

interface CategoryRow {
  id: string;
  name: string;
  applies_to: string;
  is_active: number;
}

const BLANK_CATEGORY_FORM = {
  name: '',
  applies_to: 'all',
};

function CategoriesSection() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: categoriesData, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ ...BLANK_CATEGORY_FORM });

  const categories = (categoriesData?.data ?? []) as CategoryRow[];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_CATEGORY_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: CategoryRow) {
    setEditing(c);
    setForm({ name: c.name, applies_to: c.applies_to });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, ...form });
        toast.success(tCommon('saved'));
      } else {
        await createCategory.mutateAsync(form);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  const APPLIES_OPTIONS = ['all', 'incident', 'problem', 'change'] as const;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:categories.title')}</CardTitle>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings:categories.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:categories.empty')}</p>
            <p className="text-xs mt-1">{t('settings:categories.empty_hint')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:categories.name')}</TableHead>
                <TableHead>{t('settings:categories.applies_to')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`settings:categories.applies_options.${c.applies_to}`, { defaultValue: c.applies_to })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:categories.edit') : t('settings:categories.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:categories.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Hardware"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:categories.applies_to')}</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {t(`settings:categories.applies_options.${opt}`, { defaultValue: opt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!form.name || createCategory.isPending || updateCategory.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Combined Users Settings Page (Groups + Categories)
// ============================================================
export default function UsersSettingsPage() {
  return (
    <div className="space-y-8">
      <GroupsSection />
      <CategoriesSection />
    </div>
  );
}
