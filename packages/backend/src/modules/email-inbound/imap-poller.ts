import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail, type SimpleParserOptions } from 'mailparser';

import * as emailService from './email.service.js';
import logger from '../../lib/logger.js';

// ─── Types ────────────────────────────────────────────────

interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailConfigLike {
  id: string;
  tenant_id: string;
  config: string | Record<string, unknown>;
}

// ─── ImapPoller ───────────────────────────────────────────

/**
 * Polls a single IMAP mailbox for unseen messages, parses them and
 * delegates to the email service for thread-matching / ticket creation.
 *
 * One instance is created per active IMAP config.
 */
export class ImapPoller {
  private readonly configId: string;
  private readonly tenantId: string;
  private readonly imapConfig: ImapConfig;

  constructor(emailConfig: EmailConfigLike) {
    this.configId = emailConfig.id;
    this.tenantId = emailConfig.tenant_id;

    // Config may be stored as a JSON string in the database
    const raw =
      typeof emailConfig.config === 'string'
        ? (JSON.parse(emailConfig.config) as unknown)
        : (emailConfig.config as unknown);

    this.imapConfig = raw as ImapConfig;
  }

  // ── poll ────────────────────────────────────────────────

  /**
   * Connect to the IMAP server, fetch all UNSEEN messages from INBOX,
   * process each one via emailService.processInboundEmail and mark it
   * as \Seen afterwards.
   */
  async poll(): Promise<void> {
    const client = new ImapFlow({
      host: this.imapConfig.host,
      port: this.imapConfig.port,
      secure: this.imapConfig.secure ?? true,
      auth: this.imapConfig.auth,
      logger: false,
    });

    try {
      await client.connect();

      const lock = await client.getMailboxLock('INBOX');

      try {
        // Fetch all messages; we filter to unseen ones below.
        // Using '1:*' is safe because we only parse messages without \Seen.
        for await (const message of client.fetch('1:*', {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        })) {
          // flags is optional on FetchMessageObject — default to empty Set
          const flags: Set<string> = message.flags ?? new Set<string>();
          if (flags.has('\\Seen')) {
            continue;
          }

          // source is optional — skip if not returned
          if (!message.source) {
            continue;
          }

          try {
            // Pass an explicit options object so TypeScript picks the
            // Promise<ParsedMail> overload of simpleParser instead of
            // the void overload.
            const parserOpts: SimpleParserOptions = {};
            const parsed: ParsedMail = await simpleParser(
              message.source,
              parserOpts,
            );

            // Build thread_reference from In-Reply-To and References headers
            const inReplyTo =
              typeof parsed.inReplyTo === 'string' ? parsed.inReplyTo : null;

            let referencesStr: string | null = null;
            if (Array.isArray(parsed.references)) {
              referencesStr = parsed.references.join(' ');
            } else if (typeof parsed.references === 'string') {
              referencesStr = parsed.references;
            }

            const threadReference =
              [inReplyTo, referencesStr].filter(Boolean).join(' ').trim() ||
              null;

            // Resolve to-address
            let toAddress = '';
            if (parsed.to) {
              if (Array.isArray(parsed.to)) {
                toAddress = parsed.to[0]?.value?.[0]?.address ?? '';
              } else {
                toAddress = parsed.to.value?.[0]?.address ?? '';
              }
            }

            // Collect raw headers as a flat key→value map
            const headers: Record<string, string> = {};
            for (const line of parsed.headerLines ?? []) {
              if (line.key && !headers[line.key]) {
                // headerLines gives "key: value" in `line.line`; strip the key prefix
                const colonIdx = line.line.indexOf(':');
                if (colonIdx !== -1) {
                  headers[line.key] = line.line.slice(colonIdx + 1).trim();
                }
              }
            }

            await emailService.processInboundEmail(
              this.tenantId,
              this.configId,
              {
                message_id:
                  parsed.messageId ?? `imap-uid-${message.uid}@opsweave`,
                from_address: parsed.from?.value?.[0]?.address ?? '',
                from_name: parsed.from?.value?.[0]?.name ?? null,
                to_address: toAddress,
                subject: parsed.subject ?? '(kein Betreff)',
                body_text: parsed.text ?? null,
                body_html:
                  typeof parsed.html === 'string' ? parsed.html : null,
                headers,
                thread_reference: threadReference,
                received_at:
                  parsed.date?.toISOString() ?? new Date().toISOString(),
              },
            );

            // Mark as read so it is not processed again on the next poll
            await client.messageFlagsAdd(
              { uid: message.uid },
              ['\\Seen'],
              { uid: true },
            );
          } catch (msgErr) {
            logger.error(
              { err: msgErr, uid: message.uid, configId: this.configId },
              'Failed to process IMAP message',
            );
            // Continue with the next message even if this one failed
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (connErr) {
      logger.error({ err: connErr, configId: this.configId }, 'IMAP connection error');
      throw connErr;
    }
  }

  // ── testConnection ──────────────────────────────────────

  /**
   * Verify that the stored IMAP credentials are valid without processing
   * any messages.  Returns the list of available mailbox paths.
   */
  async testConnection(): Promise<{ success: true; mailboxes: string[] }> {
    const client = new ImapFlow({
      host: this.imapConfig.host,
      port: this.imapConfig.port,
      secure: this.imapConfig.secure ?? true,
      auth: this.imapConfig.auth,
      logger: false,
    });

    await client.connect();
    const list = await client.list();
    await client.logout();

    return {
      success: true,
      mailboxes: list.map((m) => m.path),
    };
  }
}
