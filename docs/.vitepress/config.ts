import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'OpsWeave',
  base: '/opsweave/',

  ignoreDeadLinks: [
    /localhost/,
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/opsweave/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/opsweave/logo-icon.svg' }],
    ['link', { rel: 'apple-touch-icon', href: '/opsweave/apple-touch-icon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'OpsWeave — IT Service Management' }],
    ['meta', { property: 'og:description', content: 'Asset-zentriertes, workflow-gesteuertes Open-Source ITSM' }],
    ['meta', { property: 'og:image', content: '/opsweave/og-image.svg' }],
  ],

  locales: {
    root: {
      label: 'Deutsch',
      lang: 'de-DE',
      description: 'Asset-zentriertes, workflow-gesteuertes IT Service Management System',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
          { text: 'Features', link: '/features/tickets', activeMatch: '/features/' },
          { text: 'API', link: '/api/', activeMatch: '/api/' },
          {
            text: 'Entwicklung',
            items: [
              { text: 'Architektur', link: '/development/architecture' },
              { text: 'Soft-Delete Strategie', link: '/development/soft-delete' },
            ],
          },
          {
            text: 'v0.5.15',
            items: [
              { text: 'Roadmap', link: '/project/roadmap' },
              { text: 'ITIL Compliance', link: '/project/itil-compliance' },
              { text: 'Changelog', link: '/project/changelog' },
              { text: 'GitHub Releases', link: 'https://github.com/slemens/opsweave/releases' },
            ],
          },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Einführung',
              items: [
                { text: 'Was ist OpsWeave?', link: '/guide/' },
                { text: 'Installation', link: '/guide/installation' },
                { text: 'Quick Start', link: '/guide/quickstart' },
                { text: 'Lizenzierung', link: '/guide/licensing' },
              ],
            },
          ],
          '/features/': [
            {
              text: 'Features',
              items: [
                { text: 'Ticket Management', link: '/features/tickets' },
                { text: 'CMDB / Assets', link: '/features/cmdb' },
                { text: 'Workflow Engine', link: '/features/workflows' },
                { text: 'Service Katalog', link: '/features/catalog' },
                { text: 'Compliance', link: '/features/compliance' },
                { text: 'Wissensdatenbank', link: '/features/kb' },
                { text: 'Kundenportal', link: '/features/portal' },
                { text: 'E-Mail Inbound', link: '/features/email' },
                { text: 'Monitoring', link: '/features/monitoring' },
                { text: 'SLA Management', link: '/features/sla' },
                { text: 'CAB Board', link: '/features/cab' },
                { text: 'Major Incidents & Eskalation', link: '/features/incidents' },
              ],
            },
          ],
          '/api/': [
            {
              text: 'REST API',
              items: [
                { text: 'Übersicht', link: '/api/' },
                { text: 'OpenAPI Spec', link: '/api/openapi-gaps' },
              ],
            },
          ],
          '/development/': [
            {
              text: 'Entwicklung',
              items: [
                { text: 'Architektur', link: '/development/architecture' },
                { text: 'Soft-Delete Strategie', link: '/development/soft-delete' },
              ],
            },
          ],
          '/project/': [
            {
              text: 'Projekt',
              items: [
                { text: 'Roadmap', link: '/project/roadmap' },
                { text: 'ITIL Compliance', link: '/project/itil-compliance' },
                { text: 'Changelog', link: '/project/changelog' },
              ],
            },
          ],
        },
        footer: {
          message: 'Veröffentlicht unter der AGPL-3.0 Lizenz.',
          copyright: 'Copyright © 2025–2026 Sebastian Lemens & OpsWeave Contributors',
        },
        editLink: {
          pattern: 'https://github.com/slemens/opsweave/edit/main/docs/:path',
          text: 'Diese Seite bearbeiten',
        },
        docFooter: {
          prev: 'Vorherige Seite',
          next: 'Nächste Seite',
        },
        outline: {
          label: 'Auf dieser Seite',
        },
        langMenuLabel: 'Sprache ändern',
        returnToTopLabel: 'Nach oben',
        sidebarMenuLabel: 'Menü',
        darkModeSwitchLabel: 'Design',
        lightModeSwitchTitle: 'Helles Design',
        darkModeSwitchTitle: 'Dunkles Design',
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'Asset-centric, workflow-powered IT Service Management System',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/', activeMatch: '/en/guide/' },
          { text: 'Features', link: '/en/features/tickets', activeMatch: '/en/features/' },
          { text: 'API', link: '/en/api/', activeMatch: '/en/api/' },
          {
            text: 'Development',
            items: [
              { text: 'Architecture', link: '/en/development/architecture' },
              { text: 'Soft-Delete Strategy', link: '/en/development/soft-delete' },
            ],
          },
          {
            text: 'v0.5.15',
            items: [
              { text: 'Roadmap', link: '/en/project/roadmap' },
              { text: 'ITIL Compliance', link: '/en/project/itil-compliance' },
              { text: 'Changelog', link: '/en/project/changelog' },
              { text: 'GitHub Releases', link: 'https://github.com/slemens/opsweave/releases' },
            ],
          },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Introduction',
              items: [
                { text: 'What is OpsWeave?', link: '/en/guide/' },
                { text: 'Installation', link: '/en/guide/installation' },
                { text: 'Quick Start', link: '/en/guide/quickstart' },
                { text: 'Licensing', link: '/en/guide/licensing' },
              ],
            },
          ],
          '/en/features/': [
            {
              text: 'Features',
              items: [
                { text: 'Ticket Management', link: '/en/features/tickets' },
                { text: 'CMDB / Assets', link: '/en/features/cmdb' },
                { text: 'Workflow Engine', link: '/en/features/workflows' },
                { text: 'Service Catalog', link: '/en/features/catalog' },
                { text: 'Compliance', link: '/en/features/compliance' },
                { text: 'Knowledge Base', link: '/en/features/kb' },
                { text: 'Customer Portal', link: '/en/features/portal' },
                { text: 'Email Inbound', link: '/en/features/email' },
                { text: 'Monitoring', link: '/en/features/monitoring' },
                { text: 'SLA Management', link: '/en/features/sla' },
                { text: 'CAB Board', link: '/en/features/cab' },
                { text: 'Major Incidents & Escalation', link: '/en/features/incidents' },
              ],
            },
          ],
          '/en/api/': [
            {
              text: 'REST API',
              items: [
                { text: 'Overview', link: '/en/api/' },
                { text: 'OpenAPI Spec', link: '/en/api/openapi-gaps' },
              ],
            },
          ],
          '/en/development/': [
            {
              text: 'Development',
              items: [
                { text: 'Architecture', link: '/en/development/architecture' },
                { text: 'Soft-Delete Strategy', link: '/en/development/soft-delete' },
              ],
            },
          ],
          '/en/project/': [
            {
              text: 'Project',
              items: [
                { text: 'Roadmap', link: '/en/project/roadmap' },
                { text: 'ITIL Compliance', link: '/en/project/itil-compliance' },
                { text: 'Changelog', link: '/en/project/changelog' },
              ],
            },
          ],
        },
        footer: {
          message: 'Released under the AGPL-3.0 License.',
          copyright: 'Copyright © 2025–2026 Sebastian Lemens & OpsWeave Contributors',
        },
        editLink: {
          pattern: 'https://github.com/slemens/opsweave/edit/main/docs/:path',
          text: 'Edit this page',
        },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page',
        },
        outline: {
          label: 'On this page',
        },
        langMenuLabel: 'Change language',
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Light mode',
        darkModeSwitchTitle: 'Dark mode',
      },
    },
  },

  themeConfig: {
    logo: '/logo-icon.svg',
    siteTitle: 'OpsWeave',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/slemens/opsweave' },
    ],

    search: {
      provider: 'local',
    },
  },
});
