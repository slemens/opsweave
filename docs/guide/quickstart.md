# Quick Start

Nach der [Installation](/guide/installation) führt dich dieser Guide durch die ersten Schritte.

## 1. Einloggen

Öffne http://localhost:8080 und logge dich mit den Standard-Zugangsdaten ein:

- **E-Mail:** `admin@opsweave.local`
- **Passwort:** `changeme`

::: warning
Ändere das Standard-Passwort sofort unter **Einstellungen → Profil**.
:::

## 2. Erstes Ticket erstellen

1. Klicke in der Seitenleiste auf **Tickets**
2. Klicke oben rechts auf **Neues Ticket**
3. Fülle das Formular aus:
   - **Typ:** Incident
   - **Titel:** z.B. "Test-Incident"
   - **Priorität:** Medium
4. Klicke **Erstellen**

Das Ticket erscheint im Kanban-Board in der Spalte "Offen".

## 3. Erstes Asset anlegen

1. Klicke in der Seitenleiste auf **Assets / CMDB**
2. Klicke auf **Asset hinzufügen**
3. Wähle einen Asset-Typ (z.B. "Server")
4. Gib Name und ggf. IP-Adresse ein
5. Klicke **Erstellen**

## 4. Ticket mit Asset verknüpfen

1. Öffne das erstellte Ticket
2. Klicke in der rechten Spalte auf das **Asset**-Feld
3. Suche das Asset und wähle es aus
4. Das Ticket ist jetzt mit dem Asset verknüpft — SLA-Tier wird automatisch übernommen

## 5. Ersten Workflow erstellen

1. Klicke auf **Workflows** → **Neues Template**
2. Gib einen Namen ein (z.B. "Incident-Eskalation")
3. Füge Steps hinzu:
   - **Step 1:** Typ "Form" — Agent füllt Initialanalyse aus
   - **Step 2:** Typ "Approval" — Manager bestätigt Eskalation
4. Klicke **Speichern**

Workflows werden automatisch ausgelöst wenn Tickets den konfigurierten Typ/Subtyp haben.

## 6. Wissensdatenbank-Artikel erstellen

1. Klicke auf **Wissensdatenbank** → **Artikel erstellen**
2. Schreibe den Artikel in Markdown
3. Setze **Sichtbarkeit** auf "Öffentlich" wenn der Artikel im Kundenportal erscheinen soll
4. Klicke **Veröffentlichen**

## Demo-Daten

Die Seed-Daten enthalten bereits:
- 4 Demo-Benutzer (Admin User, Alex Agent, Maria Manager, Viewer User)
- 3 Gruppen (1st Level, 2nd Level, Management)
- 15 Assets mit Relations
- 5 Tickets in verschiedenen Zuständen
- 2 Workflow-Templates
- 7 KB-Artikel
- 1 Kundenportal-User (`portal@acme.example.de` / `changeme`)

**Kundenportal:** http://localhost:8080/portal/login

## Nächste Schritte

- [Ticket Management →](/features/tickets)
- [CMDB / Assets →](/features/cmdb)
- [Workflows →](/features/workflows)
- [REST API →](/api/)
