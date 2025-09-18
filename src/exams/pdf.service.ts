import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generateExamResultPdf(examData: {
    id: number;
    status: string;
    score: number | null;
    totalQuestions: number;
    passScore: number;
    startedAt: Date;
    completedAt: Date | null;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const passed = examData.status === 'COMPLETED';
      const percentage = examData.score ? Math.round((examData.score / examData.totalQuestions) * 100) : 0;
      const studentName = `${examData.user.firstName || ''} ${examData.user.lastName || ''}`.trim();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
            }
            .certificate-title {
              font-size: 24px;
              margin: 20px 0;
              color: #34495e;
            }
            .result-status {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              padding: 20px;
              margin: 20px 0;
              border-radius: 10px;
              color: white;
              background-color: ${passed ? '#27ae60' : '#e74c3c'};
            }
            .details-section {
              margin: 30px 0;
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .detail-label {
              font-weight: bold;
              color: #495057;
            }
            .detail-value {
              color: #212529;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #6c757d;
              border-top: 1px solid #dee2e6;
              padding-top: 20px;
            }
            .score-circle {
              width: 150px;
              height: 150px;
              border-radius: 50%;
              border: 8px solid ${passed ? '#27ae60' : '#e74c3c'};
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 20px auto;
              flex-direction: column;
            }
            .score-percentage {
              font-size: 24px;
              font-weight: bold;
              color: ${passed ? '#27ae60' : '#e74c3c'};
            }
            .score-text {
              font-size: 12px;
              color: #6c757d;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">INSTRUIRE AUTO</div>
            <div class="certificate-title">Driving Theory Exam Results</div>
          </div>

          <div class="result-status">
            ${passed ? 'ADMIS' : 'RESPINS'}
          </div>

          <div class="score-circle">
            <div class="score-percentage">${percentage}%</div>
            <div class="score-text">Score</div>
          </div>

          <div class="details-section">
            <div class="detail-row">
              <span class="detail-label">Student Name:</span>
              <span class="detail-value">${studentName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${examData.user.email}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Exam ID:</span>
              <span class="detail-value">#${examData.id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${examData.startedAt.toLocaleDateString('ro-RO')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Score:</span>
              <span class="detail-value">${examData.score}/${examData.totalQuestions}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Required to Pass:</span>
              <span class="detail-value">${examData.passScore}/${examData.totalQuestions}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Percentage:</span>
              <span class="detail-value">${percentage}%</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: ${passed ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                ${passed ? 'PASSED (ADMIS)' : 'FAILED (RESPINS)'}
              </span>
            </div>
          </div>

          <div class="footer">
            <p>This document was generated automatically on ${new Date().toLocaleString('ro-RO')}.</p>
            <p>Instruire Auto - Driving School Management System</p>
          </div>
        </body>
        </html>
      `;

      await page.setContent(html);
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        }
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
