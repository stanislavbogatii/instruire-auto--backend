import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendWelcome(to: string, name: string) {
    await this.mailer.sendMail({
      to,
      subject: 'Welcome to Instruire Auto!',
      template: 'welcome',   // if using templates: `templates/welcome.hbs`
      context: { name },     // data for template
      // or without templates:
      // text: `Hello ${name}, welcome aboard!`,
      // html: `<b>Hello ${name}</b>, welcome aboard!`,
    });
  }

  async sendResetPasswordMail(to: string, resetLink: string) {
    await this.mailer.sendMail({
      to,
      subject: "Reset password",
      template: 'reset-password', 
      context: {
        resetLink,
      },
    })
  }
}
