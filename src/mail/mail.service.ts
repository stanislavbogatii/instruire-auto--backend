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

  async sendEnrollmentContracts(
    to: string,
    studentData: {
      firstName: string;
      lastName: string;
      contractNumber: string;
      contractDate: string;
      cutie: string;
      telefon: string;
    },
    attachments: {
      applicationPDF: Buffer;
      contractPDF: Buffer;
    }
  ) {
    await this.mailer.sendMail({
      to,
      subject: 'Documentele dumneavoastră de înscriere - Școala Auto PROD-AM SERVICE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Școala Auto PROD-AM SERVICE</h1>
            <p style="color: #7f8c8d; margin: 0;">Instruire profesională pentru categoria B</p>
          </div>

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">Bună ziua, ${studentData.firstName} ${studentData.lastName}!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Bun venit la Școala Auto PROD-AM SERVICE</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
            <h3 style="color: #2c3e50; margin-top: 0;">📋 Documentele dumneavoastră</h3>
            <p style="color: #495057; line-height: 1.6;">
              Vă mulțumim pentru înscrierea la cursurile noastre de conducere auto!<br>
              Atașat la acest email veți găsi următoarele documente:
            </p>
            <ul style="color: #495057; line-height: 1.8;">
              <li><strong>📄 Cererea de înscriere</strong> - completată cu datele dumneavoastră personale</li>
              <li><strong>📝 Contractul de prestări servicii</strong> - Nr. ${studentData.contractNumber}</li>
            </ul>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important:</strong> Vă rugăm să printați ambele documente, să le semnați și să le aduceți la prima lecție.
              </p>
            </div>
          </div>

          <div style="background-color: #e7f3ff; padding: 25px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #0066cc;">
            <h3 style="color: #0066cc; margin-top: 0;">ℹ️ Detalii contract</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #495057;"><strong>Număr contract:</strong></td>
                <td style="padding: 8px 0; color: #2c3e50;">${studentData.contractNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #495057;"><strong>Data:</strong></td>
                <td style="padding: 8px 0; color: #2c3e50;">${studentData.contractDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #495057;"><strong>Categorie:</strong></td>
                <td style="padding: 8px 0; color: #2c3e50;">B (autoturisme)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #495057;"><strong>Tip cutie:</strong></td>
                <td style="padding: 8px 0; color: #2c3e50;">${studentData.cutie}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #495057;"><strong>Telefon contact:</strong></td>
                <td style="padding: 8px 0; color: #2c3e50;">${studentData.telefon}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">✅ Pașii următori</h3>
            <ol style="color: #155724; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Printați și semnați documentele atașate</li>
              <li>Pregătiți actele necesare (buletin, certificat medical)</li>
              <li>Așteptați confirmarea pentru programarea primei lecții</li>
              <li>Prezentați-vă cu toate documentele la prima sesiune</li>
            </ol>
          </div>

          <div style="background-color: #fff; border: 2px solid #e9ecef; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
            <h3 style="color: #2c3e50; margin-top: 0;">📞 Contact</h3>
            <p style="color: #495057; margin-bottom: 15px;">Pentru orice întrebări sau nelămuriri, ne puteți contacta:</p>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;">
                  <span style="color: #6c757d;">📱 Telefon:</span>
                </td>
                <td style="padding: 5px 0;">
                  <strong style="color: #2c3e50;">060 798 666</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0;">
                  <span style="color: #6c757d;">✉️ Email:</span>
                </td>
                <td style="padding: 5px 0;">
                  <a href="mailto:instruire.auto.botanica@gmail.com" style="color: #0066cc; text-decoration: none;">
                    instruire.auto.botanica@gmail.com
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0;">
                  <span style="color: #6c757d;">🕐 Program:</span>
                </td>
                <td style="padding: 5px 0;">
                  <strong style="color: #2c3e50;">Luni - Vineri, 09:00 - 18:00</strong>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e9ecef;">
            <p style="color: #2c3e50; font-size: 18px; margin-bottom: 10px;">
              <strong>Vă dorim succes la examen! 🚗</strong>
            </p>
            <p style="color: #6c757d; margin: 0;">
              Cu stimă,<br>
              <strong>Echipa Școlii Auto PROD-AM SERVICE</strong>
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6c757d; text-align: center; margin: 0;">
            Acest email a fost generat automat. Vă rugăm să nu răspundeți direct la acest mesaj.<br>
            Pentru suport, contactați-ne la numerele de telefon indicate mai sus.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Cerere_Inscriere_${studentData.lastName}_${studentData.firstName}.pdf`,
          content: attachments.applicationPDF,
          contentType: 'application/pdf',
        },
        {
          filename: `Contract_${studentData.contractNumber}_${studentData.lastName}_${studentData.firstName}.pdf`,
          content: attachments.contractPDF,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
