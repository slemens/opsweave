# Lizenzierung

OpsWeave nutzt ein **Offline-Freemium-Modell** — Community Edition ist dauerhaft kostenlos,
Enterprise-Features werden durch einen kryptografisch signierten Lizenz-Key freigeschaltet.

## Community Edition (kostenlos)

Sofort verfügbar, kein Account oder Registrierung nötig.

| Ressource | Limit |
|-----------|-------|
| Assets | ≤ 50 |
| Benutzer | ≤ 5 |
| Tickets | Unbegrenzt |
| Workflow-Templates | ≤ 3 |
| Compliance-Frameworks | ≤ 1 |
| Monitoring-Quellen | ≤ 1 |

Alle gespeicherten Daten bleiben zugänglich — nur die **Erstellung** neuer Einträge wird
bei Erreichen des Limits blockiert (keine Datenlöschung, kein Hard-Block).

## Enterprise Edition

Schaltet alle Limits und zusätzliche Features frei:

| Feature | Beschreibung |
|---------|--------------|
| Unbegrenzte Assets | Keine Asset-Beschränkung |
| Unbegrenzte Benutzer | Kein User-Limit |
| Unbegrenzte Workflows | Beliebig viele Templates |
| Alle Compliance-Frameworks | ISO 27001, DSGVO, BSI etc. |
| OIDC/SAML Auth | Azure AD, Keycloak, Okta |
| Vertikale Service-Kataloge | Kundenspezifische Kataloge |
| Kundenportal | Self-Service für Endkunden |
| E-Mail Inbound | IMAP + Webhook-Provider |
| Kommerzieller Support | SLA-basierter Support |

## Wie die Lizenzierung funktioniert

OpsWeave nutzt **offline-validierbare JWT-Lizenzen (RS256)**:

1. Du kaufst eine Enterprise-Lizenz → wir generieren ein JWT mit unserem privaten Key
2. Du trägst das JWT in **Einstellungen → Lizenz** ein
3. OpsWeave validiert die Signatur mit dem eingebetteten Public Key
4. Kein Internet-Zugang, kein Lizenzserver, kein "Phone Home"
5. Das Ablaufdatum wird bei jedem Start geprüft

```
┌─────────────────────────────────────┐
│         Lizenz-JWT (RS256)          │
│                                     │
│  iss: "opsweave"                    │
│  sub: "Acme Corp"                   │
│  exp: 2026-12-31T00:00:00Z          │
│  edition: "enterprise"              │
│  limits: { maxAssets: -1, ... }     │
│  features: { oidcAuth: true, ... }  │
└─────────────────────────────────────┘
        ↕ RS256 Signatur
┌─────────────────────────────────────┐
│  Public Key (im App-Code eingebettet│
│  → offline validierbar)             │
└─────────────────────────────────────┘
```

## Lizenz aktivieren

1. Öffne **Einstellungen → Lizenz**
2. Füge deinen Lizenz-Key (JWT-String) ein
3. Klicke **Lizenz aktivieren**
4. Enterprise-Features sind sofort verfügbar

Die aktive Lizenz zeigt: Lizenz-Inhaber, Ablaufdatum, freigeschaltete Features und Limits.

## Preise

Für aktuelle Preise und Lizenzanfragen: [GitHub Issues](https://github.com/slemens/opsweave/issues)
oder kontaktiere uns über das Repository.

## Open Source

OpsWeave ist unter der **AGPL-3.0 Lizenz** veröffentlicht. Du darfst:
- Den Code kostenlos verwenden, modifizieren und weitergeben
- Eigene Instanzen betreiben (auch kommerziell)
- Modifikationen müssen unter AGPL-3.0 veröffentlicht werden

Der Enterprise-Key ist keine Code-Restriktion — er ist ein Signal für kommerzielle Unterstützung.
