export type Attachment = {
  filename: string;
  content: Buffer;
  cid?: string;
};

export interface IEmailService {
  send: (name: string, emailAddress: string, subject: string, htmlBody: string, textBody: string, attachments?: Attachment[], headers?: Record<string, string>) => Promise<void>;
  mask: (emailAddress: string) => string;
}
