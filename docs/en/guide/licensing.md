# Licensing

OpsWeave uses an **offline freemium model** — the Community Edition is permanently free,
and Enterprise features are unlocked through a cryptographically signed license key.

## Community Edition (Free)

Available immediately, no account or registration required.

| Resource | Limit |
|----------|-------|
| Assets | ≤ 50 |
| Users | ≤ 5 |
| Tickets | Unlimited |
| Workflow Templates | ≤ 3 |
| Compliance Frameworks | ≤ 1 |
| Monitoring Sources | ≤ 1 |

All stored data remains accessible — only the **creation** of new entries is
blocked when the limit is reached (no data deletion, no hard block).

## Enterprise Edition

Unlocks all limits and additional features:

| Feature | Description |
|---------|-------------|
| Unlimited Assets | No asset restriction |
| Unlimited Users | No user limit |
| Unlimited Workflows | Any number of templates |
| All Compliance Frameworks | ISO 27001, GDPR, BSI etc. |
| OIDC/SAML Auth | Azure AD, Keycloak, Okta |
| Vertical Service Catalogs | Customer-specific catalogs |
| Customer Portal | Self-service for end customers |
| Email Inbound | IMAP + webhook providers |
| Commercial Support | SLA-based support |

## How Licensing Works

OpsWeave uses **offline-verifiable JWT licenses (RS256)**:

1. You purchase an Enterprise license → we generate a JWT with our private key
2. You enter the JWT in **Settings → License**
3. OpsWeave validates the signature with the embedded public key
4. No internet access, no license server, no "phone home"
5. The expiration date is checked on every startup

```
┌─────────────────────────────────────┐
│         License JWT (RS256)         │
│                                     │
│  iss: "opsweave"                    │
│  sub: "Acme Corp"                   │
│  exp: 2026-12-31T00:00:00Z          │
│  edition: "enterprise"              │
│  limits: { maxAssets: -1, ... }     │
│  features: { oidcAuth: true, ... }  │
└─────────────────────────────────────┘
        ↕ RS256 Signature
┌─────────────────────────────────────┐
│  Public Key (embedded in app code   │
│  → offline verifiable)              │
└─────────────────────────────────────┘
```

## Activate License

1. Open **Settings → License**
2. Paste your license key (JWT string)
3. Click **Activate License**
4. Enterprise features are immediately available

The active license displays: license holder, expiration date, enabled features, and limits.

## Pricing

For current pricing and license inquiries: [GitHub Issues](https://github.com/slemens/opsweave/issues)
or contact us via the repository.

## Open Source

OpsWeave is released under the **AGPL-3.0 License**. You may:
- Use, modify, and redistribute the code for free
- Operate your own instances (including commercially)
- Modifications must be published under AGPL-3.0

The Enterprise key is not a code restriction — it is a signal for commercial support.
