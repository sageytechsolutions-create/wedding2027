import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface EmailConfig {
  to: string | string[];
  subject: string;
  templateId?: string;
  context?: Record<string, any>;
  htmlBody?: string;
  textBody?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
}

export interface SendResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export class EmailDeliveryService {
  private transporter: Transporter;
  private templates: Map<string, string> = new Map();

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templates = ['summary-report', 'full-report', 'executive-report', 'alert-notification'];

    templates.forEach((templateName) => {
      try {
        const templatePath = join(process.cwd(), 'src', 'templates', 'email', `${templateName}.html`);
        const templateContent = readFileSync(templatePath, 'utf-8');
        this.templates.set(templateName, templateContent);
      } catch {
        console.warn(`Template ${templateName} not found, using fallback`);
      }
    });
  }

  async sendEmail(config: EmailConfig): Promise<SendResult> {
    const messageId = randomUUID();

    try {
      let htmlBody = config.htmlBody;

      if (config.templateId && this.templates.has(config.templateId)) {
        const template = this.templates.get(config.templateId)!;
        htmlBody = this.renderTemplate(template, config.context || {});
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@reinvestmentplatform.com',
        to: Array.isArray(config.to) ? config.to.join(',') : config.to,
        subject: config.subject,
        html: htmlBody,
        text: config.textBody,
        attachments: config.attachments || [],
        messageId,
      };

      const info = await this.transporter.sendMail(mailOptions);

      await this.logDelivery({
        messageId,
        recipients: Array.isArray(config.to) ? config.to : [config.to],
        status: 'sent',
        subject: config.subject,
      });

      return { messageId, status: 'sent' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logDelivery({
        messageId,
        recipients: Array.isArray(config.to) ? config.to : [config.to],
        status: 'failed',
        subject: config.subject,
        error: errorMessage,
      });

      return { messageId, status: 'failed', error: errorMessage };
    }
  }

  async sendScheduledReport(
    scheduleId: string,
    recipients: string[],
    reportType: string,
    reportBuffer: Buffer,
    portfolioName: string
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];

    const templateMap: { [key: string]: string } = {
      summary: 'summary-report',
      full: 'full-report',
      executive: 'executive-report',
    };

    const templateId = templateMap[reportType] || 'summary-report';

    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient,
        subject: `${portfolioName} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        templateId,
        context: {
          portfolio_name: portfolioName,
          report_type: reportType,
          generated_date: new Date().toLocaleDateString(),
          recipient_name: recipient.split('@')[0],
        },
        attachments: [
          {
            filename: `portfolio_report_${reportType}.pdf`,
            content: reportBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      results.push(result);

      await this.logEmailDelivery({
        schedule_id: scheduleId,
        recipient_email: recipient,
        report_type: reportType,
        status: result.status,
        message_id: result.messageId,
      });
    }

    return results;
  }

  async sendTestEmail(recipient: string, templateId: string = 'summary-report'): Promise<SendResult> {
    return this.sendEmail({
      to: recipient,
      subject: '[Test] Portfolio Analytics Report',
      templateId,
      context: {
        portfolio_name: 'Test Portfolio',
        report_type: 'summary',
        generated_date: new Date().toLocaleDateString(),
        is_test: true,
      },
    });
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      console.error('Template rendering error:', error);
      return template;
    }
  }

  private async logDelivery(data: {
    messageId: string;
    recipients: string[];
    status: string;
    subject: string;
    error?: string;
  }): Promise<void> {
    try {
      for (const recipient of data.recipients) {
        await prisma.emailDeliveryLog.create({
          data: {
            id: randomUUID(),
            message_id: data.messageId,
            recipient_email: recipient,
            subject: data.subject,
            status: data.status,
            error_message: data.error,
            sent_at: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to log email delivery:', error);
    }
  }

  private async logEmailDelivery(data: {
    schedule_id: string;
    recipient_email: string;
    report_type: string;
    status: string;
    message_id: string;
  }): Promise<void> {
    try {
      await prisma.emailDeliveryLog.create({
        data: {
          id: randomUUID(),
          schedule_id: data.schedule_id,
          recipient_email: data.recipient_email,
          report_type: data.report_type,
          status: data.status,
          message_id: data.message_id,
          sent_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log scheduled email delivery:', error);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection error:', error);
      return false;
    }
  }
}

export const emailDeliveryService = new EmailDeliveryService();
