/**
 * AssetPickerDialog — Searchable, filterable asset picker for ticket assignment.
 * Replaces the plain <Select> dropdown that doesn't scale beyond ~50 assets.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Server, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAssets, type AssetListParams, type AssetWithRelations } from '@/api/assets';
import { useCustomers } from '@/api/customers';
import { ASSET_TYPES, ASSET_STATUSES } from '@opsweave/shared';

// Asset type categories for quick filtering
const TYPE_CATEGORIES: Record<string, readonly string[]> = {
  compute: ['server_physical', 'server_virtual', 'virtualization_host', 'container', 'container_host'],
  network: ['network_switch', 'network_router', 'network_firewall', 'network_load_balancer', 'network_wap'],
  storage: ['storage_san', 'storage_nas', 'storage_backup'],
  infrastructure: ['rack', 'pdu', 'ups'],
  software: ['database', 'application', 'service', 'middleware', 'cluster'],
  enduser: ['workstation', 'laptop', 'printer'],
  other: ['other'],
};

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssetId?: string | null;
  onSelect: (assetId: string | null) => void;
}

const PAGE_SIZE = 10;

export function AssetPickerDialog({
  open,
  onOpenChange,
  currentAssetId,
  onSelect,
}: AssetPickerDialogProps) {
  const { t } = useTranslation(['tickets', 'cmdb', 'common']);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeCategory, setTypeCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset filters on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setDebouncedSearch('');
      setTypeCategory('all');
      setStatusFilter('all');
      setCustomerFilter('all');
      setPage(1);
    }
  }, [open]);

  // ── Build query params ──
  const queryParams: AssetListParams = {
    page,
    limit: PAGE_SIZE,
    sort: 'display_name',
    order: 'asc',
  };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (statusFilter !== 'all') queryParams.status = statusFilter as AssetListParams['status'];
  if (customerFilter !== 'all') queryParams.customer_id = customerFilter;
  if (typeCategory !== 'all') {
    const types = TYPE_CATEGORIES[typeCategory];
    if (types) {
      queryParams.asset_types = types.join(',');
    }
  }

  const { data: assetsResponse, isLoading } = useAssets(queryParams);
  const { data: customersData } = useCustomers();

  const assets = assetsResponse?.data ?? [];
  const meta = assetsResponse?.meta;
  const totalPages = meta ? Math.ceil(meta.total / PAGE_SIZE) : 1;
  const customers = (customersData?.data ?? []).filter((c) => c.is_active);

  const handleSelect = useCallback(
    (assetId: string | null) => {
      onSelect(assetId);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleCategoryChange = useCallback((value: string) => {
    setTypeCategory(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleCustomerChange = useCallback((value: string) => {
    setCustomerFilter(value);
    setPage(1);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('tickets:detail_fields.asset')}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('cmdb:search_placeholder', { defaultValue: 'Name, IP, Hostname...' })}
            className="pl-9 pr-9"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={typeCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cmdb:type_categories.all')}</SelectItem>
              {Object.keys(TYPE_CATEGORIES).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`cmdb:type_categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common:all')}</SelectItem>
              {ASSET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`cmdb:statuses.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={handleCustomerChange}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder={t('tickets:fields.customer')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common:all')}</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-1">
          {isLoading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('cmdb:no_results', { defaultValue: 'Keine Assets gefunden' })}
              </p>
            </div>
          ) : (
            <div className="space-y-1 px-1">
              {/* Remove assignment option */}
              {currentAssetId && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="flex w-full items-center gap-3 rounded-lg border border-dashed border-destructive/30 px-3 py-2.5 text-left text-sm transition-colors hover:bg-destructive/5"
                >
                  <X className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    {t('tickets:detail_fields.no_asset')}
                  </span>
                </button>
              )}

              {assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  isSelected={asset.id === currentAssetId}
                  onSelect={handleSelect}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              {t('common:pagination.showing', {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, meta?.total ?? 0),
                total: meta?.total ?? 0,
                defaultValue: `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, meta?.total ?? 0)} von ${meta?.total ?? 0}`,
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Asset Row ──

function AssetRow({
  asset,
  isSelected,
  onSelect,
  t,
}: {
  asset: AssetWithRelations;
  isSelected: boolean;
  onSelect: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(asset.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-accent',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Server className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{asset.display_name}</span>
          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {t(`cmdb:types.${asset.asset_type}`, { defaultValue: asset.asset_type })}
          </Badge>
          {asset.ip_address && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {asset.ip_address}
            </span>
          )}
          {asset.customer && (
            <span className="text-[11px] text-muted-foreground truncate">
              {asset.customer.name}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="secondary"
        className={cn(
          'text-[10px] shrink-0',
          asset.status === 'active' && 'bg-green-500/10 text-green-700 dark:text-green-400',
          asset.status === 'maintenance' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
          asset.status === 'inactive' && 'bg-gray-500/10 text-gray-600',
          asset.status === 'decommissioned' && 'bg-red-500/10 text-red-600',
        )}
      >
        {t(`cmdb:statuses.${asset.status}`, { defaultValue: asset.status })}
      </Badge>
    </button>
  );
}
