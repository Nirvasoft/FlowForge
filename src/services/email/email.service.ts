/**
 * FlowForge Email Service
 * Sends real emails using Nodemailer with Ethereal (test) or production SMTP.
 * 
 * In development/testing mode, uses Ethereal to capture emails —
 * a preview URL is logged to the console for each sent email.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('email-service');

// ============================================================================
// Email Service
// ============================================================================

class EmailService {
    private transporter: Transporter | null = null;
    private initialized = false;
    private initializing: Promise<void> | null = null;

    /**
     * Initialize the email transporter.
     * Uses Ethereal for testing if SMTP_HOST is not configured.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initializing) return this.initializing;

        this.initializing = this._doInit();
        await this.initializing;
    }

    private async _doInit(): Promise<void> {
        const smtpHost = process.env.SMTP_HOST;
        const isTestConfig = !smtpHost || smtpHost === 'smtp.example.com';

        if (isTestConfig) {
            // Create an Ethereal test account automatically
            logger.info('No SMTP configured — creating Ethereal test account...');
            try {
                const testAccount = await nodemailer.createTestAccount();

                this.transporter = nodemailer.createTransport({
                    host: testAccount.smtp.host,
                    port: testAccount.smtp.port,
                    secure: testAccount.smtp.secure,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });

                logger.info(
                    { user: testAccount.user },
                    '📧 Ethereal test account created — emails will be captured at https://ethereal.email'
                );
                console.log('\n' + '='.repeat(70));
                console.log('📧 ETHEREAL EMAIL (Test Mode)');
                console.log('='.repeat(70));
                console.log(`   Login:    ${testAccount.user}`);
                console.log(`   Password: ${testAccount.pass}`);
                console.log(`   Web:      https://ethereal.email`);
                console.log(`   Preview links will appear in the console for each sent email.`);
                console.log('='.repeat(70) + '\n');
            } catch (err) {
                logger.error({ error: err }, 'Failed to create Ethereal test account');
                // Create a fallback that just logs
                this.transporter = null;
            }
        } else {
            // Use configured SMTP server
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            logger.info({ host: smtpHost }, 'SMTP transporter configured');
        }

        this.initialized = true;
    }

    /**
     * Send an email.
     * Returns the preview URL (Ethereal) or messageId.
     */
    async sendEmail(options: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
    }): Promise<{ messageId: string; previewUrl: string | null }> {
        await this.initialize();

        if (!this.transporter) {
            // Fallback: just log the email
            logger.info(
                { to: options.to, subject: options.subject },
                'Email logged (no transporter available)'
            );
            return { messageId: 'simulated', previewUrl: null };
        }

        const from = process.env.SMTP_FROM || 'FlowForge <noreply@flowforge.dev>';

        try {
            const info = await this.transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                text: options.text || '',
                html: options.html || options.text || '',
            });

            const previewUrl = nodemailer.getTestMessageUrl(info) || null;

            logger.info(
                {
                    messageId: info.messageId,
                    to: options.to,
                    subject: options.subject,
                    previewUrl,
                },
                '✉️  Email sent successfully'
            );

            if (previewUrl) {
                console.log(`\n📧 Email sent to ${options.to}`);
                console.log(`   Subject: ${options.subject}`);
                console.log(`   Preview: ${previewUrl}\n`);
            }

            return {
                messageId: info.messageId,
                previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
            };
        } catch (err) {
            logger.error(
                { error: err, to: options.to, subject: options.subject },
                'Failed to send email'
            );
            throw err;
        }
    }

    /**
     * Send a templated workflow notification email.
     */
    async sendWorkflowNotification(options: {
        to: string;
        subject: string;
        workflowName: string;
        taskName?: string;
        body?: string;
        variables?: Record<string, unknown>;
    }): Promise<{ messageId: string; previewUrl: string | null }> {
        const vars = options.variables || {};

        // Build a simple HTML email
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🔄 FlowForge Notification</h1>
        </div>
        <div style="background: #1e1e2e; padding: 24px; border: 1px solid #333; border-top: none; border-radius: 0 0 12px 12px; color: #e0e0e0;">
          <h2 style="color: #a78bfa; margin-top: 0;">${options.subject}</h2>
          <p style="color: #ccc;"><strong>Workflow:</strong> ${options.workflowName}</p>
          ${options.taskName ? `<p style="color: #ccc;"><strong>Task:</strong> ${options.taskName}</p>` : ''}
          ${options.body ? `<div style="margin: 16px 0; padding: 16px; background: #2a2a3e; border-radius: 8px; color: #ddd;">${options.body}</div>` : ''}
          
          ${Object.keys(vars).length > 0 ? `
            <div style="margin-top: 16px;">
              <h3 style="color: #a78bfa; font-size: 14px; text-transform: uppercase;">Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(vars)
                    .filter(([key]) => !key.startsWith('_'))
                    .map(([key, val]) => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #333; color: #999; font-size: 13px; white-space: nowrap;">${key}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #333; color: #e0e0e0; font-size: 13px;">${String(val)}</td>
                    </tr>
                  `).join('')}
              </table>
            </div>
          ` : ''}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #333;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated notification from FlowForge. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

        return this.sendEmail({
            to: options.to,
            subject: `[FlowForge] ${options.subject}`,
            html,
            text: `${options.subject}\n\nWorkflow: ${options.workflowName}\n${options.taskName ? `Task: ${options.taskName}\n` : ''}${options.body || ''}\n\n${Object.entries(vars)
                    .filter(([key]) => !key.startsWith('_'))
                    .map(([key, val]) => `${key}: ${val}`)
                    .join('\n')
                }`,
        });
    }
}

export const emailService = new EmailService();
