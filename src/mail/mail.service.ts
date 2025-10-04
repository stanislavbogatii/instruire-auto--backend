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
    });
  }

  async sendReservationConfirmation(to: string, context: {
    firstName: string;
    instructorName: string;
    startTime: string;
    sector: string;
    confirmationUrl: string;
  }) {
    await this.mailer.sendMail({
      to,
      subject: 'Confirmă lecția rezervată de conducere pentru mâine',
      template: 'reservation-confirmation',
      context,
    });
  }

  async sendExamResults(exam: {
    id: number;
    status: string;
    score: number | null;
    totalQuestions: number;
    passScore: number;
    user: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }) {
    const passed = exam.status === 'COMPLETED';
    const percentage = exam.score ? Math.round((exam.score / exam.totalQuestions) * 100) : 0;

    await this.mailer.sendMail({
      to: exam.user.email,
      subject: `Exam Results - ${passed ? 'PASSED' : 'FAILED'}`,
      template: 'exam-results',
      context: {
        studentName: `${exam.user.firstName || ''} ${exam.user.lastName || ''}`.trim(),
        examId: exam.id,
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        passScore: exam.passScore,
        percentage,
        passed,
        status: exam.status,
      },
      // If no template exists, send HTML directly
      html: `
        <h2>Exam Results</h2>
        <p>Dear ${`${exam.user.firstName || ''} ${exam.user.lastName || ''}`.trim()},</p>
        <p>Here are your exam results:</p>
        <ul>
          <li><strong>Exam ID:</strong> ${exam.id}</li>
          <li><strong>Score:</strong> ${exam.score}/${exam.totalQuestions}</li>
          <li><strong>Percentage:</strong> ${percentage}%</li>
          <li><strong>Required to Pass:</strong> ${exam.passScore}/${exam.totalQuestions}</li>
          <li><strong>Status:</strong> <strong style="color: ${passed ? 'green' : 'red'}">${passed ? 'PASSED' : 'FAILED'}</strong></li>
        </ul>
        <p>${passed ? 'Congratulations! You have passed the exam.' : 'Unfortunately, you did not pass this time. Please study and try again.'}</p>
      `,
    });
  }

  async sendExamResultsWithPdf(examData: {
    id: number;
    status: string;
    score: number | null;
    totalQuestions: number;
    passScore: number;
    user: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }, pdfBuffer: Buffer) {
    const passed = examData.status === 'COMPLETED';
    const percentage = examData.score ? Math.round((examData.score / examData.totalQuestions) * 100) : 0;
    const studentName = `${examData.user.firstName || ''} ${examData.user.lastName || ''}`.trim();

    await this.mailer.sendMail({
      to: examData.user.email,
      subject: `Exam Results - ${passed ? 'PASSED (ADMIS)' : 'FAILED (RESPINS)'}`,
      html: `
        <h2>Exam Results</h2>
        <p>Dear ${studentName},</p>
        <p>Here are your exam results:</p>
        <ul>
          <li><strong>Exam ID:</strong> ${examData.id}</li>
          <li><strong>Score:</strong> ${examData.score}/${examData.totalQuestions}</li>
          <li><strong>Percentage:</strong> ${percentage}%</li>
          <li><strong>Required to Pass:</strong> ${examData.passScore}/${examData.totalQuestions}</li>
          <li><strong>Status:</strong> <strong style="color: ${passed ? 'green' : 'red'}">${passed ? 'PASSED (ADMIS)' : 'FAILED (RESPINS)'}</strong></li>
        </ul>
        <p>${passed ? 'Congratulations! You have passed the exam.' : 'Unfortunately, you did not pass this time. Please study and try again.'}</p>
        <p>Please find your detailed results in the attached PDF certificate.</p>
      `,
      attachments: [
        {
          filename: `exam-results-${examData.id}-${passed ? 'ADMIS' : 'RESPINS'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }
}
