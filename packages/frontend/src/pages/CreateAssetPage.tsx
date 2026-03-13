import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAsset, type CreateAssetPayload } from '@/api/assets';
import { useCustomers } from '@/api/customers';
import { useAssetTypes } from '@/api/asset-types';
import { SLA_TIERS, ENVIRONMENTS, ASSET_TYPE_CATEGORIES } from '@opsweave/shared';
import { getDefaultValues } from '@/lib/attribute-schema';
import { DynamicFormRenderer } from '@/components/cmdb/DynamicFormRenderer';

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CreateAssetPage() {
  const { t } = useTranslation('cmdb');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();

  const createAsset = useCreateAsset();
  const { data: assetTypesData } = useAssetTypes();
  const { data: customersData } = useCustomers();

  // ── Form State ─────────────────────────────────────────
  const [createType, setCreateType] = useState<string>('server_virtual');
  const [createName, setCreateName] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createIp, setCreateIp] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createSla, setCreateSla] = useState('none');
  const [createEnv, setCreateEnv] = useState('__none__');
  const [createCustomer, setCreateCustomer] = useState('__none__');
  const [createAttributes, setCreateAttributes] = useState<Record<string, unknown>>({});

  // ── Derived Data ───────────────────────────────────────
  const assetTypeGroups = useMemo(() => {
    const types = assetTypesData ?? [];
    const grouped: Record<string, string[]> = {};
    for (const t of types) {
      const cat = t.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t.slug);
    }
    return ASSET_TYPE_CATEGORIES
      .filter((cat) => grouped[cat]?.length)
      .map((cat) => ({ category: cat, types: grouped[cat] ?? [] }));
  }, [assetTypesData]);

  const typeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const at of assetTypesData ?? []) map.set(at.slug, at.name);
    return map;
  }, [assetTypesData]);

  const getTypeName = useCallback((slug: string) => {
    const i18nKey = `types.${slug}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return typeNameMap.get(slug) ?? slug;
  }, [t, typeNameMap]);

  const createTypeSchema = useMemo(() => {
    const types = assetTypesData ?? [];
    const match = types.find((at) => at.slug === createType);
    return match?.attribute_schema ?? [];
  }, [assetTypesData, createType]);

  const customerOptions = useMemo(() => {
    const list = customersData?.data ?? [];
    return list.map((c) => ({ value: c.id, label: c.name }));
  }, [customersData]);

  // ── Handlers ───────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!createName.trim() || !createDisplayName.trim()) return;

    const payload: CreateAssetPayload = {
      asset_type: createType,
      name: createName.trim(),
      display_name: createDisplayName.trim(),
      sla_tier: createSla as CreateAssetPayload['sla_tier'],
    };
    if (createIp.trim()) payload.ip_address = createIp.trim();
    if (createLocation.trim()) payload.location = createLocation.trim();
    if (createEnv && createEnv !== '__none__') payload.environment = createEnv as CreateAssetPayload['environment'];
    if (createCustomer && createCustomer !== '__none__') payload.customer_id = createCustomer;
    if (Object.keys(createAttributes).length > 0) {
      payload.attributes = createAttributes;
    }

    try {
      const created = await createAsset.mutateAsync(payload);
      toast.success(t('create_success'));
      navigate(`/assets/${created.id}`);
    } catch {
      toast.error(t('create_error'));
    }
  }, [createType, createName, createDisplayName, createIp, createLocation, createSla, createEnv, createCustomer, createAttributes, createAsset, t, navigate]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="page-create-asset">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/assets')} data-testid="btn-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('create')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('create_description')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Main content (2/3 width) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.asset_type')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={createType} onValueChange={(v) => {
                setCreateType(v);
                const newType = (assetTypesData ?? []).find((at) => at.slug === v);
                setCreateAttributes(getDefaultValues(newType?.attribute_schema ?? []));
              }}>
                <SelectTrigger data-testid="select-asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypeGroups.map((group) => (
                    <SelectGroup key={group.category}>
                      <SelectLabel>{t(`type_categories.${group.category}`)}</SelectLabel>
                      {group.types.map((at) => (
                        <SelectItem key={at} value={at}>
                          {getTypeName(at)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Naming */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.display_name')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fields.name')}</Label>
                  <Input
                    placeholder={t('placeholder_name')}
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    data-testid="input-asset-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('fields.display_name')}</Label>
                  <Input
                    placeholder={t('placeholder_display_name')}
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    data-testid="input-asset-display-name"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fields.ip_address')}</Label>
                  <Input
                    placeholder="10.0.0.1"
                    value={createIp}
                    onChange={(e) => setCreateIp(e.target.value)}
                    data-testid="input-asset-ip"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('fields.location')}</Label>
                  <Input
                    placeholder="DC-01 / Rack A3"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    data-testid="input-asset-location"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic type-specific attributes (Evo-3E) */}
          {createTypeSchema.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dynamic_fields.attributes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicFormRenderer
                  schema={createTypeSchema}
                  values={createAttributes}
                  onChange={setCreateAttributes}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Classification + Actions (1/3 width) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.sla_tier')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SLA */}
              <div className="space-y-2">
                <Label>{t('fields.sla_tier')}</Label>
                <Select value={createSla} onValueChange={setCreateSla}>
                  <SelectTrigger data-testid="select-sla-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_TIERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`sla_tiers.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <Label>{t('fields.environment')}</Label>
                <Select value={createEnv} onValueChange={setCreateEnv}>
                  <SelectTrigger data-testid="select-environment">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {t(`environments.${e}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label>{t('fields.customer')}</Label>
                <Select value={createCustomer} onValueChange={setCreateCustomer}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="\u2014" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void handleCreate()}
              disabled={!createName.trim() || !createDisplayName.trim() || createAsset.isPending}
              className="w-full"
              data-testid="btn-submit"
            >
              {createAsset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('create')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/assets')} className="w-full" data-testid="btn-cancel">
              {tCommon('actions.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
