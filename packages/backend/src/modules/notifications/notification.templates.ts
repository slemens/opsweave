import type { NotificationEventType, NotificationPayload } from './notification.service.js';

// ─── Email Template Rendering ─────────────────────────────

interface EmailRendered {
  subject: string;
  html: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7">
  <tr><td style="background:#2563eb;padding:16px 24px">
    <h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:600">OpsWeave</h1>
  </td></tr>
  <tr><td style="padding:24px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">${escapeHtml(title)}</h2>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center">
    <p style="margin:0;font-size:12px;color:#a1a1aa">OpsWeave — Weaving your IT operations together</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function ticketBadge(ticketNumber: string, ticketType: string): string {
  const colors: Record<string, string> = {
    incident: '#ef4444',
    problem: '#a855f7',
    change: '#14b8a6',
  };
  const color = colors[ticketType] ?? '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;font-family:monospace;background:${color}20;color:${color};border:1px solid ${color}40">${escapeHtml(ticketNumber)}</span>`;
}

function fieldRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#71717a;font-size:14px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
    <td style="padding:6px 0 6px 16px;font-size:14px;color:#18181b">${value}</td>
  </tr>`;
}

// ─── Template Renderers ───────────────────────────────────

const renderers: Record<NotificationEventType, (p: NotificationPayload) => EmailRendered> = {
  ticket_assigned: (p) => ({
    subject: `[${p.ticket_number}] Ticket assigned to you: ${p.ticket_title}`,
    html: wrapLayout(
      'Ticket Assigned',
      `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46">A ticket has been assigned to you.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
        ${p.changed_by_name ? fieldRow('Assigned by', escapeHtml(p.changed_by_name)) : ''}
      </table>`,
    ),
  }),

  ticket_status_changed: (p) => ({
    subject: `[${p.ticket_number}] Status changed: ${p.old_value} → ${p.new_value}`,
    html: wrapLayout(
      'Status Changed',
      `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46">The ticket status has been updated.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
        ${fieldRow('Old Status', escapeHtml(p.old_value ?? '-'))}
        ${fieldRow('New Status', `<strong>${escapeHtml(p.new_value ?? '-')}</strong>`)}
        ${p.changed_by_name ? fieldRow('Changed by', escapeHtml(p.changed_by_name)) : ''}
      </table>`,
    ),
  }),

  ticket_commented: (p) => ({
    subject: `[${p.ticket_number}] New comment on: ${p.ticket_title}`,
    html: wrapLayout(
      'New Comment',
      `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46">A new comment was added to the ticket.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
        ${p.changed_by_name ? fieldRow('By', escapeHtml(p.changed_by_name)) : ''}
      </table>
      ${p.comment_content ? `<div style="margin-top:16px;padding:12px;background:#f4f4f5;border-radius:6px;font-size:14px;color:#3f3f46;white-space:pre-wrap">${escapeHtml(p.comment_content.slice(0, 500))}${p.comment_content.length > 500 ? '…' : ''}</div>` : ''}`,
    ),
  }),

  sla_warning: (p) => ({
    subject: `[${p.ticket_number}] SLA Warning: ${p.ticket_title}`,
    html: wrapLayout(
      'SLA Warning',
      `<div style="padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;margin-bottom:16px">
        <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">⚠️ SLA deadline is approaching</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
      </table>`,
    ),
  }),

  sla_breached: (p) => ({
    subject: `[${p.ticket_number}] SLA BREACHED: ${p.ticket_title}`,
    html: wrapLayout(
      'SLA Breached',
      `<div style="padding:12px;background:#fee2e2;border:1px solid #ef4444;border-radius:6px;margin-bottom:16px">
        <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600">🚨 SLA has been breached</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
      </table>`,
    ),
  }),

  ticket_escalated: (p) => ({
    subject: `[${p.ticket_number}] Escalated: ${p.ticket_title}`,
    html: wrapLayout(
      'Ticket Escalated',
      `<div style="padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;margin-bottom:16px">
        <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">🔺 Ticket has been escalated</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
        ${p.new_value ? fieldRow('Reason', escapeHtml(p.new_value)) : ''}
      </table>`,
    ),
  }),

  major_incident_declared: (p) => ({
    subject: `🚨 [${p.ticket_number}] MAJOR INCIDENT: ${p.ticket_title}`,
    html: wrapLayout(
      'Major Incident Declared',
      `<div style="padding:12px;background:#fee2e2;border:2px solid #ef4444;border-radius:6px;margin-bottom:16px">
        <p style="margin:0;font-size:16px;color:#991b1b;font-weight:700">🚨 MAJOR INCIDENT DECLARED</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
        ${p.changed_by_name ? fieldRow('Declared by', escapeHtml(p.changed_by_name)) : ''}
      </table>`,
    ),
  }),

  major_incident_resolved: (p) => ({
    subject: `✅ [${p.ticket_number}] Major Incident resolved: ${p.ticket_title}`,
    html: wrapLayout(
      'Major Incident Resolved',
      `<div style="padding:12px;background:#d1fae5;border:1px solid #10b981;border-radius:6px;margin-bottom:16px">
        <p style="margin:0;font-size:14px;color:#065f46;font-weight:600">✅ Major incident has been resolved</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${fieldRow('Ticket', ticketBadge(p.ticket_number, p.ticket_type))}
        ${fieldRow('Title', escapeHtml(p.ticket_title))}
      </table>`,
    ),
  }),
};

export function renderNotificationEmail(
  eventType: NotificationEventType,
  payload: NotificationPayload,
): EmailRendered {
  const renderer = renderers[eventType];
  if (!renderer) {
    return {
      subject: `[${payload.ticket_number}] ${payload.ticket_title}`,
      html: wrapLayout('Notification', `<p>${escapeHtml(payload.ticket_title)}</p>`),
    };
  }
  return renderer(payload);
}
