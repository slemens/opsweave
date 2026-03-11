import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRelationTypes,
  useCreateRelationType,
  useUpdateRelationType,
  useDeleteRelationType,
} from '@/api/asset-types';
import type { RelationTypeDefinition } from '@opsweave/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  AlertDialogTrigger,
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

export default function RelationTypesSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RelationTypeDefinition | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isDirectional, setIsDirectional] = useState(true);
  const [color, setColor] = useState('');

  const { data: relationTypes, isLoading } = useRelationTypes(false);
  const createType = useCreateRelationType();
  const updateType = useUpdateRelationType();
  const deleteType = useDeleteRelationType();

  const typeList = useMemo(() => relationTypes ?? [], [relationTypes]);

  function resetForm() {
    setSlug('');
    setName('');
    setDescription('');
    setCategory('');
    setIsDirectional(true);
    setColor('');
    setEditing(null);
  }

  function openEdit(rt: RelationTypeDefinition) {
    setEditing(rt);
    setSlug(rt.slug);
    setName(rt.name);
    setDescription(rt.description ?? '');
    setCategory(rt.category ?? '');
    setIsDirectional(!!rt.is_directional);
    setColor(rt.color ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      is_directional: isDirectional ? 1 : 0,
      color: color.trim() || null,
    };
    try {
      if (editing) {
        await updateType.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('settings:relation_types.update_success'));
      } else {
        await createType.mutateAsync(payload);
        toast.success(t('settings:relation_types.create_success'));
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteType.mutateAsync(id);
      toast.success(t('settings:relation_types.delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {t('settings:relation_types.title')}
              </CardTitle>
              <CardDescription>{t('settings:relation_types.description')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:relation_types.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {typeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:relation_types.empty')}</p>
              <p className="text-xs">{t('settings:relation_types.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:relation_types.slug')}</TableHead>
                    <TableHead>{t('settings:relation_types.name_col')}</TableHead>
                    <TableHead>{t('settings:relation_types.category_col')}</TableHead>
                    <TableHead>{t('settings:relation_types.directional')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeList.map((rt) => (
                    <TableRow key={rt.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {rt.color && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: rt.color }}
                            />
                          )}
                          {rt.slug}
                          {!!rt.is_system && (
                            <Badge variant="secondary" className="text-[10px]">
                              System
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{rt.name}</TableCell>
                      <TableCell>
                        {rt.category ? (
                          <Badge variant="outline" className="text-xs">{rt.category}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rt.is_directional ? 'default' : 'outline'} className="text-[10px]">
                          {rt.is_directional
                            ? t('settings:relation_types.directional_yes')
                            : t('settings:relation_types.directional_no')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!rt.is_system ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(rt)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                {t('common:actions.edit')}
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    {t('common:actions.delete')}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('settings:relation_types.delete_confirm')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(rt.id)}>
                                      {t('common:actions.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:relation_types.edit') : t('settings:relation_types.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:relation_types.slug')}</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="my_relation"
                disabled={!!editing}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:relation_types.name_col')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Relation" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:relation_types.description_field')}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('settings:relation_types.category_col')}</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="infrastructure" />
              </div>
              <div className="grid gap-2">
                <Label>{t('settings:relation_types.color_field')}</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3b82f6" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rt-directional"
                checked={isDirectional}
                onChange={(e) => setIsDirectional(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="rt-directional" className="text-sm font-normal">
                {t('settings:relation_types.directional')}
                <span className="text-muted-foreground ml-1 text-xs">— {t('settings:relation_types.directional_hint')}</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!name.trim() || !slug.trim() || createType.isPending || updateType.isPending}
            >
              {createType.isPending || updateType.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
