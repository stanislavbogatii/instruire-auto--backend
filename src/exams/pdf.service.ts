import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
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

  async generateExamResultFormPdf(examData: {
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
      idnp?: string | null;
    };
    tickets?: Array<{
      name: string;
      startQuestion: number;
      endQuestion: number;
    }>;
    questions: Array<{
      id: number;
      selectedAnswer: number | null;
      isCorrect: boolean | null;
      order: number;
      correctAnswer?: number; // Add correct answer field
    }>;
  }): Promise<Buffer> {
    let browser;
    
    try {
      // Try to launch browser with comprehensive configuration
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
          '--disable-xss-auditor',
          '--disable-bundled-ppapi-flash',
          '--disable-plugins-discovery',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-extensions'
        ],
        executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
      });
    } catch (launchError) {
      console.error('Failed to launch browser:', launchError.message);
      throw new Error(`Failed to launch browser for PDF generation. Missing system dependencies: ${launchError.message}`);
    }

    try {
      const page = await browser.newPage();
      
      // Read the template file
      const templatePath = path.join(process.cwd(), 'exam_results.html');
      let html = await fs.readFile(templatePath, 'utf8');
      
      const passed = examData.status === 'COMPLETED';
      const studentName = `${examData.user.firstName || ''} ${examData.user.lastName || ''}`.trim();
      const examDate = examData.startedAt.toLocaleDateString('ro-RO');
      const idnp = examData.user.idnp || '';
      
      // Fill in the template fields with specific regex patterns for each field
      
      // Data field
      html = html.replace(
        /(<label>Data<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Data</label>
                <div class="field-line" style="padding: 5px 10px; font-size: 11pt;">${examDate}</div>`
      );
      
      // Numele field
      html = html.replace(
        /(<label>Numele<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Numele</label>
                <div class="field-line" style="padding: 5px 10px; font-size: 11pt;">${examData.user.lastName || ''}</div>`
      );
      
      // Prenumele field
      html = html.replace(
        /(<label>Prenumele<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Prenumele</label>
                <div class="field-line" style="padding: 5px 10px; font-size: 11pt;">${examData.user.firstName || ''}</div>`
      );
      
      // Examinarea pentru primirea permisului de categoria field
      html = html.replace(
        /(<label>Examinarea pentru primirea permisului de categoria<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Examinarea pentru primirea permisului de categoria</label>
                <div class="field-line" style="padding: 5px 10px; font-size: 11pt; font-weight: bold;">B</div>`
      );
      
      // Semnătura cursantului field - leave empty
      html = html.replace(
        /(<label>Semnătura cursantului<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Semnătura cursantului</label>
                <div class="field-line"></div>`
      );
      
      // Calificativ field
      const incorrectAnswers = examData.totalQuestions - (examData.score || 0);
      const isRespins = incorrectAnswers >= 3;
      const calificativ = isRespins ? 'Respins' : 'Admis';
      html = html.replace(
        /(<label>Calificativ<\/label>\s*<div class="field-line"[^>]*><\/div>)/,
        `<label>Calificativ</label>
                <div class="field-line" style="padding: 5px 10px; font-size: 11pt; font-weight: bold; max-width: 200px;">${calificativ}</div>`
      );
      
      // Numele, Prenumele, semnătura examinatorului field - leave empty
      html = html.replace(
        /(<label>Numele, Prenumele, semnătura examinatorului<\/label>\s*<div class="field-line"><\/div>)/,
        `<label>Numele, Prenumele, semnătura examinatorului</label>
                <div class="field-line"></div>`
      );
      
      // Fill IDNP boxes
      if (idnp && idnp.trim().length > 0) {
        const cleanIdnp = idnp.trim();
        const idnpDigits = cleanIdnp.padStart(13, '0').substring(0, 13);
        
        let idnpBoxesHtml = '';
        for (let i = 0; i < 13; i++) {
          const digit = idnpDigits[i] || '';
          idnpBoxesHtml += `<input type="text" class="idnp-box" maxlength="1" value="${digit}">`;
        }
        
        html = html.replace(
          /<div class="idnp-boxes"[\s\S]*?<\/div>/,
          `<div class="idnp-boxes">${idnpBoxesHtml}</div>`
        );
      }
      
      // Fill answers table - completely dynamic approach
      const answersHtml = this.generateAnswersTable(examData.questions);
      
      // Generate tickets section if available
      const ticketsHtml = examData.tickets && examData.tickets.length > 0 
        ? this.generateTicketsSection(examData.tickets)
        : '';
      
      // Replace ALL answer tables with our tickets section + answers table
      // First replacement puts our content, subsequent ones remove the table
      let tableCount = 0;
      html = html.replace(
        /<table class="answers-table">[\s\S]*?<\/table>/g,
        () => {
          tableCount++;
          return tableCount === 1 ? ticketsHtml + answersHtml : '';
        }
      );
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm', 
          left: '15mm',
          right: '15mm'
        }
      });

      return Buffer.from(pdf);
    } catch (error) {
      console.error('Error generating exam result form PDF:', error);
      
      // Provide more specific error messages
      if (error.message.includes('libgbm') || error.message.includes('shared libraries')) {
        throw new Error('PDF generation failed: Missing system dependencies. Please contact system administrator to install required Chrome dependencies.');
      } else if (error.message.includes('Failed to launch browser')) {
        throw new Error('PDF generation failed: Browser launch error. This may be due to missing system dependencies or insufficient resources.');
      } else if (error.message.includes('ENOENT') && error.message.includes('template')) {
        throw new Error('PDF generation failed: Template file not found. Please ensure exam_results.html exists in the project root.');
      } else {
        throw new Error(`PDF generation failed: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      // Ensure browser is always closed
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }
  }

  private generateAnswersTable(questions: Array<{
    id: number;
    selectedAnswer: number | null;
    isCorrect: boolean | null;
    order: number;
    correctAnswer?: number;
  }>): string {
    // Sort questions by order
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
    const totalQuestions = sortedQuestions.length;
    
    // If no questions, return a simple message
    if (totalQuestions === 0) {
      return '<table class="answers-table"><tr><td style="text-align: center; padding: 20px;">No questions found in this exam</td></tr></table>';
    }
    
    // Create completely dynamic table based on ALL questions, but only fill answered ones
    let html = '';
    
    // Determine how many tables we need (max 24 questions per table for readability)
    const questionsPerTable = 24;
    const numTables = Math.ceil(totalQuestions / questionsPerTable);
    
    for (let tableIndex = 0; tableIndex < numTables; tableIndex++) {
      const startQuestion = tableIndex * questionsPerTable + 1;
      const endQuestion = Math.min((tableIndex + 1) * questionsPerTable, totalQuestions);
      
      html += `<table class="answers-table">`;
      
      // Question numbers row (N) - show ALL question numbers
      html += `<tr><td class="row-label">N</td>`;
      for (let i = startQuestion; i <= endQuestion; i++) {
        html += `<td class="question-cell">${i}</td>`;
      }
      html += `</tr>`;
      
      // Student answers row (I) - checkmark if student answered incorrectly
      html += `<tr><td class="row-label">I</td>`;
      for (let i = startQuestion; i <= endQuestion; i++) {
        const question = sortedQuestions.find(q => q.order === i);
        let incorrectMark = '';
        
        // Show checkmark if student answered this question incorrectly
        if (question && question.selectedAnswer !== null && question.selectedAnswer !== undefined && 
            question.isCorrect === false) {
          incorrectMark = '✓';
        }
        
        html += `<td class="question-cell">${incorrectMark}</td>`;
      }
      html += `</tr>`;
      
      // Correct answers row (C) - checkmark if student answered correctly
      html += `<tr><td class="row-label">C</td>`;
      for (let i = startQuestion; i <= endQuestion; i++) {
        const question = sortedQuestions.find(q => q.order === i);
        let correctMark = '';
        
        // Show checkmark if student answered this question correctly
        if (question && question.selectedAnswer !== null && question.selectedAnswer !== undefined && 
            question.isCorrect === true) {
          correctMark = '✓';
        }
        
        html += `<td class="question-cell">${correctMark}</td>`;
      }
      html += `</tr>`;
      
      // Results row (R) - show the actual number the student selected
      html += `<tr><td class="row-label">R</td>`;
      for (let i = startQuestion; i <= endQuestion; i++) {
        const question = sortedQuestions.find(q => q.order === i);
        let studentResponse = '';
        
        // Show the actual answer number if student answered this question
        if (question && question.selectedAnswer !== null && question.selectedAnswer !== undefined) {
          studentResponse = (question.selectedAnswer + 1).toString();
        }
        
        html += `<td class="question-cell">${studentResponse}</td>`;
      }
      html += `</tr></table>`;
      
      // Add spacing between tables if there are multiple
      if (tableIndex < numTables - 1) {
        html += '<div style="height: 20px;"></div>';
      }
    }
    
    return html;
  }

  private generateTicketsSection(tickets: Array<{
    name: string;
    startQuestion: number;
    endQuestion: number;
  }>): string {
    let html = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14pt; color: #333;">Biletele folosite:</h3>
        <ul style="margin: 5px 0; padding-left: 20px; list-style-type: none;">
    `;
    
    tickets.forEach(ticket => {
      html += `
        <li style="margin: 5px 0; font-size: 11pt;">
          <strong>• ${ticket.name}</strong> (Întrebările ${ticket.startQuestion}-${ticket.endQuestion})
        </li>
      `;
    });
    
    html += `
        </ul>
      </div>
    `;
    
    return html;
  }
}

