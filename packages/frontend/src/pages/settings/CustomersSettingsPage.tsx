import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/api/customers';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CustomerFormData {
  name: string;
  industry: string;
  contact_email: string;
  is_active: boolean;
}

const BLANK_CUSTOMER_FORM: CustomerFormData = {
  name: '',
  industry: '',
  contact_email: '',
  is_active: true,
};

interface CustomerRow {
  id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  is_active: number;
}

export default function CustomersSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { t: tCommon } = useTranslation('common');
  const { data: customersData, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormData>({ ...BLANK_CUSTOMER_FORM });

  const customers = (customersData?.data ?? []) as CustomerRow[];

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK_CUSTOMER_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: CustomerRow) {
    setEditing(c);
    setForm({
      name: c.name,
      industry: c.industry ?? '',
      contact_email: c.contact_email ?? '',
      is_active: c.is_active === 1,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      industry: form.industry.trim() || null,
      contact_email: form.contact_email.trim() || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, ...payload });
        toast.success(tCommon('saved'));
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success(tCommon('created'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  return (
    <Card data-testid="page-customers-settings">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t('settings:customers.title')}</CardTitle>
        </div>
        <Button size="sm" data-testid="btn-create-customer" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings:customers.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t('settings:customers.empty')}</p>
            <p className="text-xs mt-1">{t('settings:customers.empty_hint')}</p>
          </div>
        ) : (
          <Table data-testid="table-customers">
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings:customers.name')}</TableHead>
                <TableHead>{t('settings:customers.industry')}</TableHead>
                <TableHead>{t('settings:customers.email')}</TableHead>
                <TableHead>{t('settings:customers.status')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.industry ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.contact_email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={c.is_active ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-slate-500/15 text-slate-500'}>
                      {c.is_active ? t('settings:customers.active') : t('settings:customers.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} aria-label={t('common:actions.edit')}>
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
        <DialogContent className="max-w-md" data-testid="modal-customer">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:customers.edit') : t('settings:customers.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings:customers.name')}</Label>
              <Input
                data-testid="input-customer-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:customers.industry')}</Label>
              <Input
                data-testid="input-customer-industry"
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="IT"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings:customers.email')}</Label>
              <Input
                data-testid="input-customer-email"
                type="email"
                value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="contact@acme.com"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch data-testid="input-customer-active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{t('settings:customers.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" data-testid="btn-cancel-customer" onClick={() => setDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button data-testid="btn-save-customer" onClick={() => { void handleSave(); }} disabled={!form.name || createCustomer.isPending || updateCustomer.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
