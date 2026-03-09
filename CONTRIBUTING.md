# Contributing to OpsWeave

Thank you for your interest in contributing to OpsWeave! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/opsweave.git`
3. Set up the development environment:
   ```bash
   cd opsweave
   cp .env.example .env
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Guidelines

### Code Style
- **TypeScript** strict mode — no `any` types
- **Formatting**: Prettier (runs on commit via husky)
- **Linting**: ESLint with strict config

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(tickets): add drag-and-drop between assignee groups
fix(cmdb): prevent cycle creation in asset relations
docs: update API reference for workflow endpoints
refactor(backend): extract SLA engine into separate module
test(e2e): add ticket creation flow tests
```

### Internationalization (i18n)
- **Every user-facing string** must go through the translation system
- Add German strings first (`locales/de/`), then English (`locales/en/`)
- Run `npm run check-i18n` to verify translation completeness

### Database Compatibility
- All queries must work on **both PostgreSQL and SQLite**
- Use Drizzle ORM for all database operations
- Raw SQL is only allowed in `lib/db-specific/` with separate implementations per database
- No PostgreSQL-specific types (ENUM, INET, JSONB, TEXT[]) in schema definitions

### Testing
- Unit tests: `npm run test` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Minimum coverage: 80%
- Test both languages (de + en)

## Pull Requests

1. PRs should be in **English**
2. Reference related issues: `Closes #123`
3. Include tests for new features
4. Ensure CI passes (lint, type check, tests)
5. Use squash merge

## Reporting Issues

- Use the GitHub issue templates
- Include reproduction steps for bugs
- Specify your deployment type (single-container/multi-container)
- Include relevant logs

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
