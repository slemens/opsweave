# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in OpsWeave, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@opsweave.dev**

We will acknowledge your report within 48 hours and aim to provide a fix within 7 days for critical vulnerabilities.

## Security Best Practices

When deploying OpsWeave:

1. **Change default credentials** — The default admin password (`changeme`) must be changed immediately.
2. **Use strong secrets** — Set unique `SESSION_SECRET` and `JWT_SECRET` values.
3. **Enable HTTPS** — Always use TLS in production (configure in your reverse proxy).
4. **Restrict network access** — Database and Redis should not be exposed publicly.
5. **Keep updated** — Regularly update to the latest version for security patches.
