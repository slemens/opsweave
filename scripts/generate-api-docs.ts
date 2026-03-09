#!/usr/bin/env tsx
/**
 * OpenAPI 3.0 Spec Generator
 *
 * Outputs a static OpenAPI YAML definition for the OpsWeave API
 * based on the endpoint definitions from CLAUDE.md section 7.
 *
 * Usage: tsx scripts/generate-api-docs.ts
 * Output: docs/api/openapi.yaml
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yamlString(s: string): string {
  if (/[:#{}[\],&*?|>!'"%@`]/.test(s) || s.trim() !== s) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

interface EndpointDef {
  method: string;
  path: string;
  summary: string;
  tag: string;
  extraResponses?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Endpoint definitions — mirrors CLAUDE.md section 7
// ---------------------------------------------------------------------------

const endpoints: EndpointDef[] = [
  // Auth
  { method: 'post', path: '/api/v1/auth/login', summary: 'Login with local credentials', tag: 'Auth' },
  { method: 'post', path: '/api/v1/auth/logout', summary: 'Logout current session', tag: 'Auth' },
  { method: 'post', path: '/api/v1/auth/refresh', summary: 'Refresh authentication token', tag: 'Auth' },
  { method: 'get', path: '/api/v1/auth/me', summary: 'Get current user with tenants', tag: 'Auth' },
  { method: 'post', path: '/api/v1/auth/switch-tenant', summary: 'Switch active tenant', tag: 'Auth' },
  { method: 'get', path: '/api/v1/auth/oidc/login', summary: 'Initiate OIDC login (Enterprise)', tag: 'Auth' },
  { method: 'get', path: '/api/v1/auth/oidc/callback', summary: 'OIDC callback (Enterprise)', tag: 'Auth' },

  // Tenants
  { method: 'get', path: '/api/v1/tenants', summary: 'List all tenants (Super-Admin)', tag: 'Tenants' },
  { method: 'post', path: '/api/v1/tenants', summary: 'Create a new tenant', tag: 'Tenants' },
  { method: 'get', path: '/api/v1/tenants/{id}', summary: 'Get tenant by ID', tag: 'Tenants' },
  { method: 'put', path: '/api/v1/tenants/{id}', summary: 'Update tenant', tag: 'Tenants' },
  { method: 'get', path: '/api/v1/tenants/{id}/members', summary: 'List tenant members', tag: 'Tenants' },
  { method: 'post', path: '/api/v1/tenants/{id}/members', summary: 'Add member to tenant', tag: 'Tenants' },
  { method: 'delete', path: '/api/v1/tenants/{id}/members/{uid}', summary: 'Remove member from tenant', tag: 'Tenants' },

  // Users
  { method: 'get', path: '/api/v1/users', summary: 'List users', tag: 'Users' },
  { method: 'post', path: '/api/v1/users', summary: 'Create a new user', tag: 'Users' },
  { method: 'get', path: '/api/v1/users/{id}', summary: 'Get user by ID', tag: 'Users' },
  { method: 'put', path: '/api/v1/users/{id}', summary: 'Update user', tag: 'Users' },
  { method: 'delete', path: '/api/v1/users/{id}', summary: 'Delete user', tag: 'Users' },
  { method: 'patch', path: '/api/v1/users/{id}/language', summary: 'Update user language preference', tag: 'Users' },

  // Groups
  { method: 'get', path: '/api/v1/groups', summary: 'List assignee groups', tag: 'Groups' },
  { method: 'post', path: '/api/v1/groups', summary: 'Create a new group', tag: 'Groups' },
  { method: 'get', path: '/api/v1/groups/{id}', summary: 'Get group by ID', tag: 'Groups' },
  { method: 'put', path: '/api/v1/groups/{id}', summary: 'Update group', tag: 'Groups' },
  { method: 'delete', path: '/api/v1/groups/{id}', summary: 'Delete group', tag: 'Groups' },
  { method: 'get', path: '/api/v1/groups/{id}/members', summary: 'List group members', tag: 'Groups' },
  { method: 'post', path: '/api/v1/groups/{id}/members', summary: 'Add member to group', tag: 'Groups' },
  { method: 'delete', path: '/api/v1/groups/{id}/members/{uid}', summary: 'Remove member from group', tag: 'Groups' },
  { method: 'get', path: '/api/v1/groups/{id}/tickets', summary: 'List tickets assigned to group', tag: 'Groups' },

  // Tickets
  { method: 'get', path: '/api/v1/tickets', summary: 'List tickets with filters and pagination', tag: 'Tickets' },
  { method: 'post', path: '/api/v1/tickets', summary: 'Create a new ticket', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/{id}', summary: 'Get ticket by ID', tag: 'Tickets' },
  { method: 'put', path: '/api/v1/tickets/{id}', summary: 'Update ticket', tag: 'Tickets' },
  { method: 'patch', path: '/api/v1/tickets/{id}/status', summary: 'Update ticket status', tag: 'Tickets' },
  { method: 'patch', path: '/api/v1/tickets/{id}/assign', summary: 'Assign ticket to user or group', tag: 'Tickets' },
  { method: 'patch', path: '/api/v1/tickets/{id}/priority', summary: 'Update ticket priority', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/{id}/comments', summary: 'List ticket comments', tag: 'Tickets' },
  { method: 'post', path: '/api/v1/tickets/{id}/comments', summary: 'Add comment to ticket', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/{id}/history', summary: 'Get ticket change history', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/{id}/workflow', summary: 'Get ticket workflow state', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/stats', summary: 'Get ticket statistics', tag: 'Tickets' },
  { method: 'get', path: '/api/v1/tickets/board', summary: 'Get ticket board view', tag: 'Tickets' },

  // Assets (CMDB)
  { method: 'get', path: '/api/v1/assets', summary: 'List assets with filters', tag: 'Assets' },
  { method: 'post', path: '/api/v1/assets', summary: 'Create a new asset', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}', summary: 'Get asset by ID', tag: 'Assets' },
  { method: 'put', path: '/api/v1/assets/{id}', summary: 'Update asset', tag: 'Assets' },
  { method: 'delete', path: '/api/v1/assets/{id}', summary: 'Delete asset', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/relations', summary: 'List asset relations', tag: 'Assets' },
  { method: 'post', path: '/api/v1/assets/{id}/relations', summary: 'Create asset relation', tag: 'Assets' },
  { method: 'delete', path: '/api/v1/assets/{id}/relations/{rid}', summary: 'Delete asset relation', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/sla-chain', summary: 'Get SLA inheritance chain', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/tickets', summary: 'List tickets linked to asset', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/services', summary: 'List services linked to asset', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/compliance', summary: 'Get asset compliance status', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/{id}/graph', summary: 'Get asset topology graph', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/search', summary: 'Search assets', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/types', summary: 'List available asset types', tag: 'Assets' },
  { method: 'get', path: '/api/v1/assets/stats', summary: 'Get asset statistics', tag: 'Assets' },

  // Workflows
  { method: 'get', path: '/api/v1/workflows/templates', summary: 'List workflow templates', tag: 'Workflows' },
  { method: 'post', path: '/api/v1/workflows/templates', summary: 'Create workflow template', tag: 'Workflows' },
  { method: 'get', path: '/api/v1/workflows/templates/{id}', summary: 'Get workflow template by ID', tag: 'Workflows' },
  { method: 'put', path: '/api/v1/workflows/templates/{id}', summary: 'Update workflow template', tag: 'Workflows' },
  { method: 'delete', path: '/api/v1/workflows/templates/{id}', summary: 'Delete workflow template', tag: 'Workflows' },
  { method: 'post', path: '/api/v1/workflows/instantiate', summary: 'Instantiate a workflow from template', tag: 'Workflows' },
  { method: 'get', path: '/api/v1/workflows/instances/{id}', summary: 'Get workflow instance status', tag: 'Workflows' },
  { method: 'post', path: '/api/v1/workflows/instances/{id}/steps/{sid}/complete', summary: 'Complete a workflow step', tag: 'Workflows' },
  { method: 'post', path: '/api/v1/workflows/instances/{id}/steps/{sid}/route', summary: 'Route a workflow step', tag: 'Workflows' },
  { method: 'post', path: '/api/v1/workflows/instances/{id}/cancel', summary: 'Cancel a workflow instance', tag: 'Workflows' },

  // Service Catalog
  { method: 'get', path: '/api/v1/services/descriptions', summary: 'List service descriptions', tag: 'Service Catalog' },
  { method: 'post', path: '/api/v1/services/descriptions', summary: 'Create service description', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/descriptions/{id}', summary: 'Get service description by ID', tag: 'Service Catalog' },
  { method: 'put', path: '/api/v1/services/descriptions/{id}', summary: 'Update service description', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/horizontal', summary: 'List horizontal catalogs', tag: 'Service Catalog' },
  { method: 'post', path: '/api/v1/services/catalogs/horizontal', summary: 'Create horizontal catalog', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/horizontal/{id}', summary: 'Get horizontal catalog by ID', tag: 'Service Catalog' },
  { method: 'put', path: '/api/v1/services/catalogs/horizontal/{id}', summary: 'Update horizontal catalog', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/horizontal/{id}/items', summary: 'List items in horizontal catalog', tag: 'Service Catalog' },
  { method: 'post', path: '/api/v1/services/catalogs/horizontal/{id}/items', summary: 'Add item to horizontal catalog', tag: 'Service Catalog' },
  { method: 'delete', path: '/api/v1/services/catalogs/horizontal/{id}/items', summary: 'Remove item from horizontal catalog', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/vertical', summary: 'List vertical catalogs (Enterprise)', tag: 'Service Catalog' },
  { method: 'post', path: '/api/v1/services/catalogs/vertical', summary: 'Create vertical catalog (Enterprise)', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/vertical/{id}', summary: 'Get vertical catalog by ID', tag: 'Service Catalog' },
  { method: 'put', path: '/api/v1/services/catalogs/vertical/{id}', summary: 'Update vertical catalog', tag: 'Service Catalog' },
  { method: 'get', path: '/api/v1/services/catalogs/vertical/{id}/effective', summary: 'Get effective catalog with overrides', tag: 'Service Catalog' },

  // Compliance
  { method: 'get', path: '/api/v1/compliance/frameworks', summary: 'List regulatory frameworks', tag: 'Compliance' },
  { method: 'post', path: '/api/v1/compliance/frameworks', summary: 'Create regulatory framework', tag: 'Compliance' },
  { method: 'get', path: '/api/v1/compliance/frameworks/{id}', summary: 'Get framework by ID', tag: 'Compliance' },
  { method: 'get', path: '/api/v1/compliance/frameworks/{id}/requirements', summary: 'List framework requirements', tag: 'Compliance' },
  { method: 'post', path: '/api/v1/compliance/frameworks/{id}/requirements', summary: 'Add requirement to framework', tag: 'Compliance' },
  { method: 'get', path: '/api/v1/compliance/frameworks/{id}/matrix', summary: 'Get compliance matrix', tag: 'Compliance' },
  { method: 'get', path: '/api/v1/compliance/frameworks/{id}/gaps', summary: 'Get compliance gap analysis', tag: 'Compliance' },
  { method: 'post', path: '/api/v1/compliance/mappings', summary: 'Create requirement-service mapping', tag: 'Compliance' },
  { method: 'delete', path: '/api/v1/compliance/mappings', summary: 'Delete requirement-service mapping', tag: 'Compliance' },
  { method: 'get', path: '/api/v1/compliance/assets/{id}', summary: 'Get compliance status for asset', tag: 'Compliance' },

  // Monitoring
  { method: 'get', path: '/api/v1/monitoring/sources', summary: 'List monitoring sources', tag: 'Monitoring' },
  { method: 'post', path: '/api/v1/monitoring/sources', summary: 'Create monitoring source', tag: 'Monitoring' },
  { method: 'put', path: '/api/v1/monitoring/sources/{id}', summary: 'Update monitoring source', tag: 'Monitoring' },
  { method: 'post', path: '/api/v1/monitoring/events', summary: 'Receive monitoring event (webhook)', tag: 'Monitoring' },
  { method: 'get', path: '/api/v1/monitoring/events', summary: 'List monitoring events', tag: 'Monitoring' },

  // Email Inbound
  { method: 'get', path: '/api/v1/email/configs', summary: 'List email inbound configurations', tag: 'Email' },
  { method: 'post', path: '/api/v1/email/configs', summary: 'Create email inbound configuration', tag: 'Email' },
  { method: 'get', path: '/api/v1/email/configs/{id}', summary: 'Get email config by ID', tag: 'Email' },
  { method: 'put', path: '/api/v1/email/configs/{id}', summary: 'Update email config', tag: 'Email' },
  { method: 'delete', path: '/api/v1/email/configs/{id}', summary: 'Delete email config', tag: 'Email' },
  { method: 'post', path: '/api/v1/email/configs/{id}/test', summary: 'Test email connection', tag: 'Email' },
  { method: 'get', path: '/api/v1/email/messages', summary: 'List received email messages', tag: 'Email' },
  { method: 'get', path: '/api/v1/email/messages/{id}', summary: 'Get email message by ID', tag: 'Email' },
  { method: 'post', path: '/api/v1/email/webhook', summary: 'Inbound email webhook (Mailgun/SendGrid)', tag: 'Email' },

  // Knowledge Base
  { method: 'get', path: '/api/v1/kb/articles', summary: 'List knowledge base articles', tag: 'Knowledge Base' },
  { method: 'post', path: '/api/v1/kb/articles', summary: 'Create knowledge base article', tag: 'Knowledge Base' },
  { method: 'get', path: '/api/v1/kb/articles/{id}', summary: 'Get article by ID', tag: 'Knowledge Base' },
  { method: 'put', path: '/api/v1/kb/articles/{id}', summary: 'Update article', tag: 'Knowledge Base' },
  { method: 'delete', path: '/api/v1/kb/articles/{id}', summary: 'Delete article', tag: 'Knowledge Base' },
  { method: 'get', path: '/api/v1/kb/articles/search', summary: 'Search knowledge base', tag: 'Knowledge Base' },
  { method: 'post', path: '/api/v1/kb/articles/{id}/link/{ticketId}', summary: 'Link article to ticket', tag: 'Knowledge Base' },
  { method: 'get', path: '/api/v1/kb/categories', summary: 'List KB categories', tag: 'Knowledge Base' },

  // Customer Portal
  { method: 'post', path: '/api/v1/portal/auth/login', summary: 'Portal customer login', tag: 'Customer Portal' },
  { method: 'post', path: '/api/v1/portal/auth/logout', summary: 'Portal customer logout', tag: 'Customer Portal' },
  { method: 'get', path: '/api/v1/portal/auth/me', summary: 'Get current portal user', tag: 'Customer Portal' },
  { method: 'get', path: '/api/v1/portal/tickets', summary: 'List customer tickets', tag: 'Customer Portal' },
  { method: 'get', path: '/api/v1/portal/tickets/{id}', summary: 'Get customer ticket by ID', tag: 'Customer Portal' },
  { method: 'post', path: '/api/v1/portal/tickets/{id}/comments', summary: 'Add customer comment to ticket', tag: 'Customer Portal' },
  { method: 'post', path: '/api/v1/portal/tickets', summary: 'Create ticket from portal', tag: 'Customer Portal' },
  { method: 'get', path: '/api/v1/portal/kb/articles', summary: 'List public KB articles', tag: 'Customer Portal' },

  // Settings & License
  { method: 'get', path: '/api/v1/settings', summary: 'Get all settings', tag: 'Settings' },
  { method: 'put', path: '/api/v1/settings/{key}', summary: 'Update a setting', tag: 'Settings' },
  { method: 'get', path: '/api/v1/settings/branding', summary: 'Get branding settings', tag: 'Settings' },
  { method: 'put', path: '/api/v1/settings/branding', summary: 'Update branding settings', tag: 'Settings' },
  { method: 'get', path: '/api/v1/license', summary: 'Get current license info', tag: 'License' },
  { method: 'post', path: '/api/v1/license/activate', summary: 'Activate license with JWT key', tag: 'License' },
  { method: 'get', path: '/api/v1/license/usage', summary: 'Get license usage statistics', tag: 'License' },

  // System
  { method: 'get', path: '/api/v1/system/health', summary: 'Health check', tag: 'System' },
  { method: 'get', path: '/api/v1/system/info', summary: 'System information', tag: 'System' },
];

// ---------------------------------------------------------------------------
// YAML generation
// ---------------------------------------------------------------------------

function generateResponses(method: string): string {
  const lines: string[] = [];
  lines.push('        responses:');
  lines.push('          "200":');
  lines.push(`            description: ${method === 'post' ? 'Created' : 'OK'}`);
  lines.push('          "401":');
  lines.push('            description: Unauthorized');
  if (['get', 'put', 'patch', 'delete'].includes(method)) {
    lines.push('          "404":');
    lines.push('            description: Not Found');
  }
  return lines.join('\n');
}

function generateOpenApiYaml(): string {
  const lines: string[] = [];

  // Header
  lines.push('openapi: "3.0.3"');
  lines.push('info:');
  lines.push('  title: OpsWeave API');
  lines.push('  version: "0.1.0"');
  lines.push('  description: >-');
  lines.push('    OpsWeave is a modular, asset-centric open-source IT Service Management system.');
  lines.push('    It provides ITIL-conformant processes (Incident, Problem, Change), a CMDB,');
  lines.push('    service catalogs, compliance mapping, and monitoring integration.');
  lines.push('  license:');
  lines.push('    name: AGPL-3.0');
  lines.push('    url: https://www.gnu.org/licenses/agpl-3.0.html');
  lines.push('  contact:');
  lines.push('    name: OpsWeave');
  lines.push('    url: https://github.com/slemens/opsweave');
  lines.push('');
  lines.push('servers:');
  lines.push('  - url: http://localhost:3000');
  lines.push('    description: Local development server');
  lines.push('');

  // Tags
  const tagSet = new Set<string>();
  for (const ep of endpoints) {
    tagSet.add(ep.tag);
  }
  lines.push('tags:');
  for (const tag of tagSet) {
    lines.push(`  - name: ${yamlString(tag)}`);
  }
  lines.push('');

  // Security scheme
  lines.push('components:');
  lines.push('  securitySchemes:');
  lines.push('    cookieAuth:');
  lines.push('      type: apiKey');
  lines.push('      in: cookie');
  lines.push('      name: session');
  lines.push('    bearerAuth:');
  lines.push('      type: http');
  lines.push('      scheme: bearer');
  lines.push('      bearerFormat: JWT');
  lines.push('');
  lines.push('security:');
  lines.push('  - cookieAuth: []');
  lines.push('  - bearerAuth: []');
  lines.push('');

  // Paths
  lines.push('paths:');

  // Group endpoints by path
  const pathMap = new Map<string, EndpointDef[]>();
  for (const ep of endpoints) {
    const existing = pathMap.get(ep.path) || [];
    existing.push(ep);
    pathMap.set(ep.path, existing);
  }

  for (const [apiPath, eps] of pathMap) {
    lines.push(`  ${apiPath}:`);
    for (const ep of eps) {
      lines.push(`    ${ep.method}:`);
      lines.push(`      summary: ${yamlString(ep.summary)}`);
      lines.push(`      tags:`);
      lines.push(`        - ${yamlString(ep.tag)}`);
      lines.push(`      operationId: ${ep.method}${apiPath.replace(/[/{}-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`);
      lines.push(generateResponses(ep.method));
    }
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const outputDir = path.resolve(__dirname, '../docs/api');
  const outputPath = path.join(outputDir, 'openapi.yaml');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const yaml = generateOpenApiYaml();
  fs.writeFileSync(outputPath, yaml, 'utf-8');

  const pathCount = new Set(endpoints.map((e) => e.path)).size;
  const opCount = endpoints.length;
  console.log(`OpenAPI spec generated: ${outputPath}`);
  console.log(`  ${pathCount} paths, ${opCount} operations`);
}

main();
