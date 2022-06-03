import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport.js';

import type { Attachment, IEmailService } from './index.js';

export class NodemailerEmailService implements IEmailService {

  public constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly username: string,
    private readonly password: string,
    private readonly mode: 'TLS' | 'STARTTLS' | 'INSECURE',
  ) { /* empty */ }

  public async send(name: string, emailAddress: string, subject: string, htmlBody: string, textBody: string, attachments?: Attachment[]): Promise<void> {
    const transport = this.createTransport();
    try {
      await transport.sendMail({
        to: `${name}<${emailAddress}>`,
        from: 'QC Career School<no-reply@qccareerschool.com>',
        subject,
        html: htmlBody,
        text: textBody,
        attachments,
      });
    } finally {
      transport.close();
    }
  }

  public createTransport(): Mail {
    return nodemailer.createTransport(this.getOptions());
  }

  public getOptions(): SMTPTransport.Options {
    return {
      host: this.host,
      port: this.port,
      secure: this.mode === 'TLS',
      auth: {
        user: this.username,
        pass: this.password,
      },
      requireTLS: this.mode === 'STARTTLS',
    };
  }

  public mask(emailAddress: string): string {
    const parts = emailAddress.split('@');
    const count = parts.length;
    let returnValue = '';
    parts.filter((_, i) => i < count - 1).forEach(p => {
      const length = p.length;
      if (length <= 8) {
        returnValue += p.substring(0, 1) + '*****';
      } else if (length <= 12) {
        returnValue += p.substring(0, 1) + '********' + p.substring(length - 1, length);
      } else {
        returnValue += p.substring(0, 2) + '********' + p.substring(length - 1, length);
      }
      returnValue += '@';
    });
    returnValue += parts[count - 1];
    return returnValue;
  }
}
