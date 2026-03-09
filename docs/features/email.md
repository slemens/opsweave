# E-Mail Inbound

OpsWeave kann eingehende E-Mails automatisch in Tickets umwandeln und
Antworten auf bestehende Tickets als Kommentare zuordnen.

## Konfiguration

E-Mail-Konfigurationen werden unter **Einstellungen → E-Mail** verwaltet.

### Provider-Typen

| Typ | Beschreibung |
|-----|--------------|
| `imap` | IMAP-Polling (regelmäßiges Abrufen) |
| `webhook_mailgun` | Mailgun Inbound Webhook |
| `webhook_sendgrid` | SendGrid Inbound Parse |
| `smtp_gateway` | SMTP Gateway (eigenem MX) |

### IMAP-Konfiguration

```json
{
  "host": "imap.example.com",
  "port": 993,
  "secure": true,
  "username": "support@example.com",
  "password": "..."
}
```

## Thread-Matching

OpsWeave erkennt ob eine eingehende E-Mail eine Antwort auf ein bestehendes Ticket ist:

**Priorität 1:** `In-Reply-To` / `References` Header → bekannte `message_id`?

**Priorität 2:** Betreff enthält Ticket-Nummer (z.B. `Re: [INC-2026-00042] Server nicht erreichbar`)

**Match gefunden:** E-Mail wird als externer Kommentar an das Ticket angehängt.

**Kein Match:** Neues Ticket wird erstellt (Ticket-Typ aus Konfiguration, Gruppe aus `target_group_id`).

## Auto-Ticket

Neue E-Mails ohne Thread-Match erzeugen automatisch ein Ticket:

- **Titel:** E-Mail-Betreff
- **Beschreibung:** E-Mail-Body (Text-Version)
- **Quelle:** `email`
- **Typ:** Konfigurierbar pro E-Mail-Config (`incident` oder `change`)
- **Gruppe:** `target_group_id` aus Konfiguration
- **Reporter:** E-Mail-Absender (als Text gespeichert)

## Webhook-Ingest

Für Mailgun und SendGrid wird ein öffentlicher Webhook-Endpunkt verwendet:

```
POST /api/v1/email/webhook?provider=mailgun&config_id=<id>
POST /api/v1/email/webhook?provider=sendgrid&config_id=<id>
```

## REST API

```
GET    /api/v1/email/configs           # E-Mail-Konfigurationen
POST   /api/v1/email/configs           # Konfiguration erstellen
GET    /api/v1/email/configs/:id        # Detail
PUT    /api/v1/email/configs/:id        # Aktualisieren
DELETE /api/v1/email/configs/:id        # Löschen
POST   /api/v1/email/configs/:id/test   # Verbindungstest (IMAP)
GET    /api/v1/email/messages           # Eingegangene E-Mails (paginiert)
GET    /api/v1/email/messages/:id        # E-Mail-Detail
POST   /api/v1/email/webhook            # Webhook-Endpunkt (public)
```

::: warning IMAP-Poller
Der IMAP-Poller ist als Konfiguration vollständig implementiert.
Der Background-Worker für aktives IMAP-Polling wird in einer späteren Version aktiviert.
Webhook-basierte Provider (Mailgun, SendGrid) funktionieren sofort.
:::
