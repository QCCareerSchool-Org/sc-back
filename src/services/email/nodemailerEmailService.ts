import nodemailer from 'nodemailer';

import type { Attachment, IEmailService } from '.';

export class NodemailerEmailService implements IEmailService {

  public constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly username: string,
    private readonly password: string,
    private readonly mode: 'TLS' | 'STARTTLS' | 'INSECURE',
  ) { /* empty */ }

  public async send(name: string, emailAddress: string, subject: string, htmlBody: string, textBody: string, attachments?: Attachment[]): Promise<void> {
    const transport = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.mode === 'TLS',
      auth: {
        user: this.username,
        pass: this.password,
      },
      requireTLS: this.mode === 'STARTTLS',
    });
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
}
