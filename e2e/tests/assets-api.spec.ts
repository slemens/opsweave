import { test, expect } from '../fixtures/test-data.fixture.js';

const API_BASE = 'http://localhost:3000';

test.describe('Assets API — REST Endpoint Tests', () => {
  test('GET /api/v1/assets returns list with pagination', async ({ apiContext }) => {
    const { request } = apiContext;

    const response = await request.get('/api/v1/assets?page=1&limit=10');
    expect(response.ok()).toBe(true);

    const body = (await response.json()) as {
      data: unknown[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(10);
    expect(typeof body.meta.total).toBe('number');
    expect(typeof body.meta.totalPages).toBe('number');
  });

  test('POST /api/v1/assets creates asset and returns 201', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const response = await request.post('/api/v1/assets', {
      data: {
        name: `e2e-api-create-${ts}`,
        display_name: `E2E API Create ${ts}`,
        asset_type: 'server_virtual',
        status: 'active',
        sla_tier: 'silver',
        ip_address: '192.168.1.100',
        location: 'DC-02 / Rack A1',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as { data: { id: string; name: string; display_name: string } };
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(`e2e-api-create-${ts}`);
    expect(body.data.display_name).toBe(`E2E API Create ${ts}`);

    // Track for cleanup
    testData.track('assets', body.data.id);
  });

  test('GET /api/v1/assets/:id returns asset detail', async ({ apiContext, testData }) => {
    const { request } = apiContext;
    const ts = Date.now();

    const asset = await testData.createAsset({
      name: `e2e-api-detail-${ts}`,
      display_name: `E2E API Detail ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });

    const response = await request.get(`/api/v1/assets/${asset.id}`);
    expect(response.ok()).toBe(true);

    const body = (await response.json()) as { data: { id: string; name: string } };
    expect(body.data.id).toBe(asset.id);
    expect(body.data.name).toBe(`e2e-api-detail-${ts}`);
  });

  test('PUT /api/v1/assets/:id updates asset', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const asset = await testData.createAsset({
      name: `e2e-api-update-${ts}`,
      display_name: `E2E API Update ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    const response = await request.put(`/api/v1/assets/${asset.id}`, {
      data: {
        display_name: `E2E API Updated ${ts}`,
        status: 'maintenance',
        location: 'DC-03 / Rack C5',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = (await response.json()) as { data: { display_name: string; status: string; location: string } };
    expect(body.data.display_name).toBe(`E2E API Updated ${ts}`);
    expect(body.data.status).toBe('maintenance');
    expect(body.data.location).toBe('DC-03 / Rack C5');
  });

  test('DELETE /api/v1/assets/:id removes asset', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const asset = await testData.createAsset({
      name: `e2e-api-delete-${ts}`,
      display_name: `E2E API Delete ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Delete the asset
    const deleteResponse = await request.delete(`/api/v1/assets/${asset.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(deleteResponse.ok()).toBe(true);

    // Verify it's gone — GET should return 404
    const getResponse = await request.get(`/api/v1/assets/${asset.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('GET /api/v1/assets/:id/relations returns relations', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const assetA = await testData.createAsset({
      name: `e2e-api-rel-a-${ts}`,
      display_name: `API Rel A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-api-rel-b-${ts}`,
      display_name: `API Rel B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create a relation
    await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    // Get relations
    const response = await request.get(`/api/v1/assets/${assetA.id}/relations`);
    expect(response.ok()).toBe(true);

    const body = (await response.json()) as { data: Array<{ id: string; relation_type: string }> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const rel = body.data.find(
      (r) => r.relation_type === 'depends_on',
    );
    expect(rel).toBeDefined();
  });

  test('POST /api/v1/assets/:id/relations creates relation', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const assetA = await testData.createAsset({
      name: `e2e-api-relcreate-a-${ts}`,
      display_name: `API RelCreate A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-api-relcreate-b-${ts}`,
      display_name: `API RelCreate B ${ts}`,
      asset_type: 'application',
      status: 'active',
    });

    const response = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'runs_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as { data: { id: string; relation_type: string } };
    expect(body.data).toBeDefined();
    expect(body.data.relation_type).toBe('runs_on');
  });

  test('DELETE /api/v1/assets/:id/relations/:rid removes relation', async ({ apiContext, testData }) => {
    const { request, csrfToken } = apiContext;
    const ts = Date.now();

    const assetA = await testData.createAsset({
      name: `e2e-api-reldel-a-${ts}`,
      display_name: `API RelDel A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-api-reldel-b-${ts}`,
      display_name: `API RelDel B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create relation
    const createResponse = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(createResponse.ok()).toBe(true);
    const createBody = (await createResponse.json()) as { data: { id: string } };
    const relationId = createBody.data.id;

    // Delete relation
    const deleteResponse = await request.delete(
      `/api/v1/assets/${assetA.id}/relations/${relationId}`,
      { headers: { 'X-CSRF-Token': csrfToken } },
    );
    expect(deleteResponse.ok()).toBe(true);

    // Verify it's gone
    const relResponse = await request.get(`/api/v1/assets/${assetA.id}/relations`);
    const relBody = (await relResponse.json()) as { data: Array<{ id: string }> };
    const found = relBody.data.find((r) => r.id === relationId);
    expect(found).toBeUndefined();
  });

  test('GET /api/v1/assets/:id/sla-chain returns SLA inheritance', async ({ apiContext, testData }) => {
    const { request } = apiContext;
    const ts = Date.now();

    const asset = await testData.createAsset({
      name: `e2e-api-sla-${ts}`,
      display_name: `API SLA ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });

    const response = await request.get(`/api/v1/assets/${asset.id}/sla-chain`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('GET /api/v1/assets/stats returns statistics', async ({ apiContext }) => {
    const { request } = apiContext;

    const response = await request.get('/api/v1/assets/stats');
    expect(response.ok()).toBe(true);

    const body = (await response.json()) as { data: Record<string, unknown> };
    expect(body.data).toBeDefined();
  });

  test('asset creation requires auth (401 without token)', async ({ playwright }) => {
    // Create an unauthenticated request context
    const unauthRequest = await playwright.request.newContext({
      baseURL: API_BASE,
    });

    try {
      const response = await unauthRequest.post('/api/v1/assets', {
        data: {
          name: 'unauth-asset',
          display_name: 'Unauth Asset',
          asset_type: 'server_virtual',
          status: 'active',
        },
      });

      // Should get 401 or 403
      expect([401, 403]).toContain(response.status());
    } finally {
      await unauthRequest.dispose();
    }
  });

  test('assets are tenant-scoped (same API returns consistent data)', async ({ apiContext, testData }) => {
    const { request } = apiContext;
    const ts = Date.now();

    // Create a uniquely named asset
    const asset = await testData.createAsset({
      name: `e2e-tenant-scope-${ts}`,
      display_name: `Tenant Scoped ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Retrieve all assets and verify our asset is in the list
    const listResponse = await request.get('/api/v1/assets?limit=100');
    expect(listResponse.ok()).toBe(true);

    const listBody = (await listResponse.json()) as {
      data: Array<{ id: string; name: string }>;
    };

    const found = listBody.data.find((a) => a.id === (asset.id as string));
    expect(found).toBeDefined();
    expect(found!.name).toBe(`e2e-tenant-scope-${ts}`);

    // Verify the asset detail also works
    const detailResponse = await request.get(`/api/v1/assets/${asset.id}`);
    expect(detailResponse.ok()).toBe(true);
  });
});
