import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'de-DE',
  title: 'OpsWeave',
  description: 'Asset-zentriertes, workflow-gesteuertes IT Service Management System',
  base: '/opsweave/',

  ignoreDeadLinks: [
    /localhost/,
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/opsweave/logo-icon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'OpsWeave — IT Service Management' }],
    ['meta', { property: 'og:description', content: 'Asset-zentriertes, workflow-gesteuertes Open-Source ITSM' }],
    ['meta', { property: 'og:image', content: '/opsweave/og-image.svg' }],
  ],

  themeConfig: {
    logo: '/logo-icon.svg',
    siteTitle: 'OpsWeave',

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
        text: 'v0.3.6',
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

    socialLinks: [
      { icon: 'github', link: 'https://github.com/slemens/opsweave' },
    ],

    footer: {
      message: 'Veröffentlicht unter der AGPL-3.0 Lizenz.',
      copyright: 'Copyright © 2025–2026 OpsWeave Contributors',
    },

    editLink: {
      pattern: 'https://github.com/slemens/opsweave/edit/main/docs/:path',
      text: 'Diese Seite bearbeiten',
    },

    search: {
      provider: 'local',
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
});
