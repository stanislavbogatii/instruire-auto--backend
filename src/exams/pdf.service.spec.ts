import * as fs from 'fs/promises';
import * as puppeteer from 'puppeteer';
import { PdfService } from './pdf.service';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('PdfService', () => {
  it('writes only the attempt number into the exam form', async () => {
    const page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as unknown as jest.Mock).mockResolvedValue(browser);
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(`
      <div class="field-line" data-attempt-number></div>
      <table class="answers-table"></table>
    `);

    const pdf = await new PdfService().generateExamResultFormPdf({
      id: 42,
      attemptNumber: 3,
      status: 'FAILED',
      score: 10,
      totalQuestions: 20,
      passScore: 17,
      startedAt: new Date('2026-09-10T10:00:00.000Z'),
      completedAt: new Date('2026-09-10T10:30:00.000Z'),
      user: {
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion@example.com',
      },
      questions: [
        {
          id: 1,
          selectedAnswer: 0,
          isCorrect: false,
          order: 1,
        },
      ],
    });

    const renderedHtml = page.setContent.mock.calls[0][0] as string;

    expect(renderedHtml).toContain('>3</div>');
    expect(renderedHtml).not.toContain('data-exam-number');
    expect(pdf).toEqual(Buffer.from('pdf'));
    expect(browser.close).toHaveBeenCalled();
  });

  it('renders the daily process verbal with exam data', async () => {
    const page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('daily-pdf')),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as unknown as jest.Mock).mockResolvedValue(browser);

    const pdf = await new PdfService().generateDailyProcessVerbalPdf({
      date: '2026-09-10',
      exams: [
        {
          orderNumber: 1,
          examNumber: 545,
          attemptNumber: 7,
          startedAt: new Date('2026-09-10T10:00:00.000Z'),
          status: 'FAILED',
          score: 10,
          totalQuestions: 20,
          passScore: 17,
          user: {
            firstName: 'Ion',
            lastName: 'Popescu',
            idnp: '1234567890123',
          },
          tickets: ['B1'],
        },
      ],
    });

    const renderedHtml = page.setContent.mock.calls[0][0] as string;

    expect(renderedHtml).toContain('PROCES-VERBAL ZILNIC AL EXAMENELOR TEORETICE');
    expect(renderedHtml).toContain('2026-09-10');
    expect(renderedHtml).toContain('545');
    expect(renderedHtml).toContain('7');
    expect(renderedHtml).toContain('Popescu Ion');
    expect(renderedHtml).toContain('B1');
    expect(pdf).toEqual(Buffer.from('daily-pdf'));
    expect(browser.close).toHaveBeenCalled();
  });

  it('renders the practical daily process verbal with reservation data', async () => {
    const page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('practical-daily-pdf')),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as unknown as jest.Mock).mockResolvedValue(browser);

    const pdf = await new PdfService().generatePracticalDailyProcessVerbalPdf({
      date: '2026-09-23',
      exams: [
        {
          orderNumber: 1,
          examNumber: 17,
          attemptNumber: 2,
          date: new Date('2026-09-23T00:00:00.000Z'),
          time: '09:00',
          status: 'PASSED',
          positionInCar: 2,
          sector: 'Botanica',
          gearbox: 'manual',
          instructor: { firstName: 'Ana', lastName: 'Ionescu' },
          user: { firstName: 'Ion', lastName: 'Popescu', idnp: '1234567890123' },
        },
      ],
    });

    const renderedHtml = page.setContent.mock.calls[0][0] as string;

    expect(renderedHtml).toContain('PROCES-VERBAL ZILNIC AL EXAMENELOR PRACTICE');
    expect(renderedHtml).toContain('1234567890123');
    expect(renderedHtml).toContain('Ionescu Ana');
    expect(renderedHtml).toContain('Promovat');
    expect(pdf).toEqual(Buffer.from('practical-daily-pdf'));
    expect(browser.close).toHaveBeenCalled();
  });

  it('renders the individual practical exam document', async () => {
    const page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('practical-individual-pdf')),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as unknown as jest.Mock).mockResolvedValue(browser);

    const pdf = await new PdfService().generatePracticalIndividualExamPdf({
      attemptNumber: 2,
      date: new Date('2026-09-23T00:00:00.000Z'),
      time: '09:00',
      status: 'FAILED',
      positionInCar: 2,
      sector: 'Botanica',
      gearbox: 'manual',
      instructor: { firstName: 'Ana', lastName: 'Ionescu' },
      user: {
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion@example.com',
        phone: '+37360000000',
        idnp: '1234567890123',
      },
    });

    const renderedHtml = page.setContent.mock.calls[0][0] as string;

    expect(renderedHtml).toContain('DOCUMENT INDIVIDUAL');
    expect(renderedHtml).toContain('EXAMEN PRACTIC');
    expect(renderedHtml).toContain('>2</td>');
    expect(renderedHtml).not.toContain('Numărul examenului');
    expect(renderedHtml).toContain('Nepromovat');
    expect(pdf).toEqual(Buffer.from('practical-individual-pdf'));
    expect(browser.close).toHaveBeenCalled();
  });
});
