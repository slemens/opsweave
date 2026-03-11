import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssetTypes,
  useCreateAssetType,
  useUpdateAssetType,
  useDeleteAssetType,
} from '@/api/asset-types';
import type { AssetTypeDefinition } from '@opsweave/shared';
import { ASSET_TYPE_CATEGORIES } from '@opsweave/shared';
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

export default function AssetTypesSettingsPage() {
  const { t } = useTranslation(['settings', 'common', 'cmdb']);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssetTypeDefinition | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');

  const { data: assetTypes, isLoading } = useAssetTypes(false);
  const createType = useCreateAssetType();
  const updateType = useUpdateAssetType();
  const deleteType = useDeleteAssetType();

  const typeList = useMemo(() => assetTypes ?? [], [assetTypes]);

  function resetForm() {
    setSlug('');
    setName('');
    setDescription('');
    setCategory('other');
    setIcon('');
    setColor('');
    setEditing(null);
  }

  function openEdit(at: AssetTypeDefinition) {
    setEditing(at);
    setSlug(at.slug);
    setName(at.name);
    setDescription(at.description ?? '');
    setCategory(at.category);
    setIcon(at.icon ?? '');
    setColor(at.color ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || null,
      category,
      icon: icon.trim() || null,
      color: color.trim() || null,
    };
    try {
      if (editing) {
        await updateType.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('settings:asset_types.update_success'));
      } else {
        await createType.mutateAsync(payload);
        toast.success(t('settings:asset_types.create_success'));
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
      toast.success(t('settings:asset_types.delete_success'));
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
                <Box className="h-4 w-4" />
                {t('settings:asset_types.title')}
              </CardTitle>
              <CardDescription>{t('settings:asset_types.description')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:asset_types.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {typeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:asset_types.empty')}</p>
              <p className="text-xs">{t('settings:asset_types.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:asset_types.slug')}</TableHead>
                    <TableHead>{t('settings:asset_types.name_col')}</TableHead>
                    <TableHead>{t('settings:asset_types.category_col')}</TableHead>
                    <TableHead>{t('settings:asset_types.attributes')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeList.map((at) => (
                    <TableRow key={at.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {at.slug}
                          {!!at.is_system && (
                            <Badge variant="secondary" className="text-[10px]">
                              System
                            </Badge>
                          )}
                          {!at.is_active && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {t('common:status.inactive')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{at.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t(`cmdb:type_categories.${at.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {at.attribute_schema?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!at.is_system ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(at)}>
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
                                      {t('settings:asset_types.delete_confirm')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(at.id)}>
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
              {editing ? t('settings:asset_types.edit') : t('settings:asset_types.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:asset_types.slug')}</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="my_custom_type"
                disabled={!!editing}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:asset_types.name_col')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Custom Type" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:asset_types.description_field')}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:asset_types.category_col')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`cmdb:type_categories.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('settings:asset_types.icon_field')}</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="server" />
              </div>
              <div className="grid gap-2">
                <Label>{t('settings:asset_types.color_field')}</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3b82f6" />
              </div>
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
