import { jest } from '@jest/globals';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

import { NodemailerEmailService } from './nodemailerEmailService.js';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn(), close: jest.fn() })),
}));

describe('NodeMailerEmailService', () => {
  let host: string;
  let port: number;
  let username: string;
  let password: string;
  let mode: 'INSECURE' | 'TLS' | 'STARTTLS';
  let nodemailerEmailService: NodemailerEmailService;

  beforeEach(() => {
    host = 'localhost';
    port = 25;
    username = 'test';
    password = 'test';
    mode = 'INSECURE';
    nodemailerEmailService = new NodemailerEmailService(host, port, username, password, mode);
  });

  describe('getOptions', () => {

    it('should return an SMTPTransport.options object based the current settings', () => {
      expect(nodemailerEmailService.getOptions()).toEqual({
        host,
        port,
        secure: false,
        auth: { user: username, pass: password },
        requireTLS: false,
      });
    });
  });

  describe('createTransport', () => {

    it('should return a transport created with the settings provided by getOptions', () => {
      const transport = { sendMail: jest.fn(), close: jest.fn() };
      jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transport as unknown as Mail);

      const options = { host: 'localhost' };
      jest.spyOn(nodemailerEmailService, 'getOptions').mockReturnValue(options);

      expect(nodemailerEmailService.createTransport()).toBe(transport);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(options);
    });
  });

  describe('send', () => {

    it('should create a transport, send the mail, and close the transport', async () => {
      const name = 'Joe Smith';
      const emailAddress = 'joe@example.com';
      const subject = 'Test Email';
      const htmlBody = `<html><body><h1>test</h1></body></html>`;
      const textBody = '*Test*';

      const sendMail = jest.fn();
      const close = jest.fn();
      const transport = { sendMail, close } as unknown as Mail;
      const createTransport = jest.spyOn(nodemailerEmailService, 'createTransport').mockReturnValue(transport);

      const send = nodemailerEmailService.send(name, emailAddress, subject, htmlBody, textBody);
      await expect(send).resolves.toBeUndefined();
      expect(createTransport).toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });

    it('should still close the transport if sendMail rejects and then reject with the error', async () => {
      const name = 'Joe Smith';
      const emailAddress = 'joe@example.com';
      const subject = 'Test Email';
      const htmlBody = `<html><body><h1>test</h1></body></html>`;
      const textBody = '*Test*';

      const error = new Error('error sending email');
      const sendMail = jest.fn().mockRejectedValue(error);
      const close = jest.fn();
      const transport = { sendMail, close } as unknown as Mail;
      const createTransport = jest.spyOn(nodemailerEmailService, 'createTransport').mockReturnValue(transport);

      const send = nodemailerEmailService.send(name, emailAddress, subject, htmlBody, textBody);
      await expect(send).rejects.toBe(error);
      expect(createTransport).toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });
  });

  describe('mask', () => {

    describe('when the username is short (<= 8)', () => {
      const emailAddress = 'donald@example.com';
      it('should replace the username with the first letter of the username and five asterisks', () => {
        expect(nodemailerEmailService.mask(emailAddress)).toBe('d*****@example.com');
      });
    });

    describe('when the username is medium length (<= 12)', () => {
      const emailAddress = 'donald.smith@example.com';
      it('should replace the username with the first letter of the username, eight asterisks, and the last letter of the username', () => {
        expect(nodemailerEmailService.mask(emailAddress)).toBe('d********h@example.com');
      });
    });

    describe('when the username is long (> 12)', () => {
      const emailAddress = 'donald.roland.smith@example.com';
      it('should replace the username with the first two letters of the username, eight asterisks, and the last letter of the username', () => {
        expect(nodemailerEmailService.mask(emailAddress)).toBe('do********h@example.com');
      });
    });
  });
});
