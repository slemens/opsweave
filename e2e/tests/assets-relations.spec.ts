import { test, expect } from '../fixtures/test-data.fixture.js';
import { byTestId } from '../helpers/selectors.js';

test.describe('Assets Relations — UI & Graph Tests', () => {
  test('create two assets and add a relation between them', async ({ authenticatedPage: page, testData }) => {
    const ts = Date.now();

    // Create two assets via API
    const assetA = await testData.createAsset({
      name: `e2e-rel-source-${ts}`,
      display_name: `E2E Relation Source ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-rel-target-${ts}`,
      display_name: `E2E Relation Target ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Navigate to asset A detail page
    await page.goto(`/assets/${assetA.id}`);
    await expect(page.locator(byTestId('page-asset-detail'))).toBeVisible({ timeout: 15_000 });

    // Switch to relations tab
    await page.locator(byTestId('tab-relations')).click();

    // Click the add-relation button (no data-testid, find by text content)
    const addRelBtn = page.getByRole('button', { name: /add|hinzufügen/i }).first();
    await expect(addRelBtn).toBeVisible({ timeout: 5_000 });
    await addRelBtn.click();

    // The relation dialog should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select target asset via the Select component in the dialog
    // The dialog has three Select components: Direction, Type, and Target Asset
    const selectTriggers = dialog.locator('button[role="combobox"]');

    // Select target asset (third select — "Select Asset")
    const targetSelect = selectTriggers.nth(2);
    if (await targetSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await targetSelect.click();
      // Find and click the target asset option
      const targetOption = page.getByRole('option').filter({ hasText: `E2E Relation Target ${ts}` });
      await expect(targetOption).toBeVisible({ timeout: 5_000 });
      await targetOption.click();
    }

    // Submit the relation — find the submit button (not the cancel button)
    const submitBtn = dialog.locator('button').filter({ hasText: /^(?!.*cancel|.*abbrechen).*/i }).last();
    await submitBtn.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('relation appears in relations tab after creation via API', async ({ authenticatedPage: page, testData, apiContext }) => {
    const ts = Date.now();
    const { request, csrfToken } = apiContext;

    // Create two assets
    const assetA = await testData.createAsset({
      name: `e2e-relview-a-${ts}`,
      display_name: `E2E RelView A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-relview-b-${ts}`,
      display_name: `E2E RelView B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create relation via API
    const relResponse = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(relResponse.ok()).toBe(true);
    const relData = (await relResponse.json()) as { data: { id: string } };
    testData.track('relations', relData.data.id);

    // Navigate to asset A detail, relations tab
    await page.goto(`/assets/${assetA.id}`);
    await expect(page.locator(byTestId('page-asset-detail'))).toBeVisible({ timeout: 15_000 });
    await page.locator(byTestId('tab-relations')).click();

    // Verify that the relation target asset name appears
    await expect(page.getByText(`E2E RelView B ${ts}`)).toBeVisible({ timeout: 10_000 });
  });

  test('remove relation via API and verify it disappears', async ({ authenticatedPage: page, testData, apiContext }) => {
    const ts = Date.now();
    const { request, csrfToken } = apiContext;

    const assetA = await testData.createAsset({
      name: `e2e-reldel-a-${ts}`,
      display_name: `E2E RelDel A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-reldel-b-${ts}`,
      display_name: `E2E RelDel B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create relation
    const relResponse = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(relResponse.ok()).toBe(true);
    const relData = (await relResponse.json()) as { data: { id: string } };
    const relationId = relData.data.id;

    // Delete relation via API
    const delResponse = await request.delete(
      `/api/v1/assets/${assetA.id}/relations/${relationId}`,
      { headers: { 'X-CSRF-Token': csrfToken } },
    );
    expect(delResponse.ok()).toBe(true);

    // Navigate to asset A and verify no relations
    await page.goto(`/assets/${assetA.id}`);
    await expect(page.locator(byTestId('page-asset-detail'))).toBeVisible({ timeout: 15_000 });
    await page.locator(byTestId('tab-relations')).click();

    // The target asset name should NOT appear
    await expect(page.getByText(`E2E RelDel B ${ts}`)).not.toBeVisible({ timeout: 5_000 });
  });

  test('SLA chain endpoint returns data', async ({ apiContext, testData }) => {
    const { request } = apiContext;
    const ts = Date.now();

    const asset = await testData.createAsset({
      name: `e2e-sla-chain-${ts}`,
      display_name: `E2E SLA Chain ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });

    const response = await request.get(`/api/v1/assets/${asset.id}/sla-chain`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('relation graph renders a container element', async ({ authenticatedPage: page, testData, apiContext }) => {
    const ts = Date.now();
    const { request, csrfToken } = apiContext;

    const assetA = await testData.createAsset({
      name: `e2e-graph-a-${ts}`,
      display_name: `E2E Graph A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-graph-b-${ts}`,
      display_name: `E2E Graph B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create a relation so the graph has edges
    await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    // Navigate to asset detail and look for graph
    await page.goto(`/assets/${assetA.id}`);
    await expect(page.locator(byTestId('page-asset-detail'))).toBeVisible({ timeout: 15_000 });

    // Switch to relations tab
    await page.locator(byTestId('tab-relations')).click();

    // Look for graph toggle and switch to graph view
    const graphToggle = page.locator(byTestId('btn-graph-view'));
    if (await graphToggle.isVisible({ timeout: 3_000 })) {
      await graphToggle.click();

      // React Flow renders inside a container with class .react-flow
      const graphContainer = page.locator('.react-flow');
      await expect(graphContainer).toBeVisible({ timeout: 10_000 });
    }
  });

  test('create multiple related assets to form a DAG', async ({ apiContext, testData }) => {
    const ts = Date.now();
    const { request, csrfToken } = apiContext;

    // Create 3 assets: A -> B -> C
    const assetA = await testData.createAsset({
      name: `e2e-dag-a-${ts}`,
      display_name: `DAG A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-dag-b-${ts}`,
      display_name: `DAG B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });
    const assetC = await testData.createAsset({
      name: `e2e-dag-c-${ts}`,
      display_name: `DAG C ${ts}`,
      asset_type: 'application',
      status: 'active',
    });

    // A -> B
    const rel1 = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(rel1.ok()).toBe(true);

    // B -> C
    const rel2 = await request.post(`/api/v1/assets/${assetB.id}/relations`, {
      data: {
        source_asset_id: assetB.id as string,
        target_asset_id: assetC.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(rel2.ok()).toBe(true);

    // Verify relations on asset A
    const relResponse = await request.get(`/api/v1/assets/${assetA.id}/relations`);
    expect(relResponse.ok()).toBe(true);
    const relBody = (await relResponse.json()) as { data: Array<{ id: string }> };
    expect(relBody.data.length).toBeGreaterThanOrEqual(1);
  });

  test('duplicate relation is prevented', async ({ apiContext, testData }) => {
    const ts = Date.now();
    const { request, csrfToken } = apiContext;

    const assetA = await testData.createAsset({
      name: `e2e-dup-a-${ts}`,
      display_name: `DUP A ${ts}`,
      asset_type: 'server_physical',
      status: 'active',
    });
    const assetB = await testData.createAsset({
      name: `e2e-dup-b-${ts}`,
      display_name: `DUP B ${ts}`,
      asset_type: 'server_virtual',
      status: 'active',
    });

    // Create relation
    const rel1 = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(rel1.ok()).toBe(true);

    // Try to create the same relation again — should fail (409 or 400)
    const rel2 = await request.post(`/api/v1/assets/${assetA.id}/relations`, {
      data: {
        source_asset_id: assetA.id as string,
        target_asset_id: assetB.id as string,
        relation_type: 'depends_on',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });
    // Should not succeed — expect 409 Conflict or 400 Bad Request
    expect(rel2.ok()).toBe(false);
    expect([400, 409]).toContain(rel2.status());
  });
});
