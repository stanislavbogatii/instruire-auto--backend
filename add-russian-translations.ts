import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface QuestionTranslation {
  ro: string;
  ru: string;
}

interface AnswerTranslation {
  ro: string;
  ru: string;
}

interface PracticeQuestion {
  bilet: number;
  question_number: number;
  question: QuestionTranslation;
  answers: AnswerTranslation[];
  correctAnswer: number;
  image: string;
}

interface ExamQuestion {
  bilet: number;
  question_number: number;
  correct_answer: number;
  question: QuestionTranslation;
  answers: AnswerTranslation[];
}

interface PracticeData {
  questions: PracticeQuestion[];
}

interface ExamData {
  questions: ExamQuestion[];
}

async function addRussianTranslations() {
  try {
    console.log('🚀 Starting Russian translations update...\n');

    // Load JSON files
    const practiceJsonPath = path.join(process.cwd(), 'practice.json');
    const examJsonPath = path.join(process.cwd(), 'instruire_auto_json.json');

    console.log('📚 Reading JSON files...');
    const practiceData: PracticeData = JSON.parse(fs.readFileSync(practiceJsonPath, 'utf8'));
    const examData: ExamData = JSON.parse(fs.readFileSync(examJsonPath, 'utf8'));

    console.log(`   ✅ Practice questions: ${practiceData.questions.length}`);
    console.log(`   ✅ Exam questions: ${examData.questions.length}\n`);

    // Create maps for quick lookup
    console.log('🗂️  Building translation maps...');
    
    // Map for practice: bilet_questionNumber -> question data
    const practiceMap = new Map<string, PracticeQuestion>();
    practiceData.questions.forEach(q => {
      const key = `${q.bilet}_${q.question_number}`;
      practiceMap.set(key, q);
    });

    // Map for exam: bilet_questionNumber -> question data
    const examMap = new Map<string, ExamQuestion>();
    examData.questions.forEach(q => {
      const key = `${q.bilet}_${q.question_number}`;
      examMap.set(key, q);
    });

    console.log(`   ✅ Practice map created with ${practiceMap.size} entries`);
    console.log(`   ✅ Exam map created with ${examMap.size} entries\n`);

    // Get all tickets with their questions
    console.log('🎫 Fetching tickets from database...');
    const tickets = await prisma.ticket.findMany({
      include: {
        questions: {
          include: {
            question: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    console.log(`   ✅ Found ${tickets.length} tickets\n`);

    let updatedPracticeQuestions = 0;
    let updatedExamQuestions = 0;
    let skippedQuestions = 0;

    // Process each ticket
    for (const ticket of tickets) {
      console.log(`📋 Processing ticket: ${ticket.name} (Type: ${ticket.type})`);
      
      // Extract bilet number from ticket name
      // Practice tickets: "Practice P1" -> bilet 1
      // Exam tickets: "Bilet 1" -> bilet 1
      const biletMatch = ticket.name.match(/(?:Practice P|Bilet ?)(\d+)/i);
      
      if (!biletMatch) {
        console.log(`   ⚠️  Could not extract bilet number from ticket name: ${ticket.name}`);
        continue;
      }

      const biletNumber = parseInt(biletMatch[1]);
      console.log(`   🎯 Bilet number: ${biletNumber}`);

      // Process each question in this ticket
      for (const ticketQuestion of ticket.questions) {
        const question = ticketQuestion.question;
        const questionNumber = ticketQuestion.order; // Using order as question number
        const key = `${biletNumber}_${questionNumber}`;

        // Determine if this is a practice or exam question based on ticket type
        let translationData: PracticeQuestion | ExamQuestion | undefined;
        
        if (ticket.type === 'PRACTICE') {
          translationData = practiceMap.get(key);
        } else {
          translationData = examMap.get(key);
        }

        if (!translationData) {
          console.log(`   ⚠️  No translation found for ${ticket.type} Q${questionNumber} (key: ${key})`);
          skippedQuestions++;
          continue;
        }

        // Check if question already has Russian translation
        // If text is already JSON with ro/ru, skip it
        try {
          const existingText = JSON.parse(question.text);
          if (existingText.ru) {
            console.log(`   ⏭️  Question ${questionNumber} already has Russian translation`);
            continue;
          }
        } catch {
          // Not JSON yet, needs update
        }

        // Prepare multilingual data
        const multilingualText = JSON.stringify({
          ro: translationData.question.ro,
          ru: translationData.question.ru
        });

        const multilingualAnswers = JSON.stringify(
          translationData.answers.map(a => ({
            ro: a.ro,
            ru: a.ru
          }))
        );

        // Update the question
        await prisma.question.update({
          where: { id: question.id },
          data: {
            text: multilingualText,
            answers: multilingualAnswers
          }
        });

        if (ticket.type === 'PRACTICE') {
          updatedPracticeQuestions++;
        } else {
          updatedExamQuestions++;
        }

        if ((updatedPracticeQuestions + updatedExamQuestions) % 50 === 0) {
          console.log(`   📝 Progress: ${updatedPracticeQuestions + updatedExamQuestions} questions updated...`);
        }
      }

      console.log(`   ✅ Completed ticket: ${ticket.name}\n`);
    }

    // Final summary
    console.log('🎉 Russian translations added successfully!\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Practice questions updated: ${updatedPracticeQuestions}`);
    console.log(`   ✅ Exam questions updated: ${updatedExamQuestions}`);
    console.log(`   ⏭️  Questions skipped: ${skippedQuestions}`);
    console.log(`   📝 Total questions updated: ${updatedPracticeQuestions + updatedExamQuestions}\n`);

    // Verification
    console.log('🔍 Verification:');
    const sampleQuestion = await prisma.question.findFirst({
      include: {
        ticketQuestions: {
          include: {
            ticket: true
          }
        }
      }
    });

    if (sampleQuestion) {
      console.log('\n📋 Sample question after update:');
      console.log(`   Ticket: ${sampleQuestion.ticketQuestions[0]?.ticket.name}`);
      
      try {
        const questionText = JSON.parse(sampleQuestion.text);
        const answers = JSON.parse(sampleQuestion.answers);
        
        console.log(`   Romanian: ${questionText.ro.substring(0, 80)}...`);
        console.log(`   Russian: ${questionText.ru.substring(0, 80)}...`);
        console.log(`   Answers: ${answers.length} options (both RO and RU available)`);
        console.log(`   ✅ Multilingual format confirmed!`);
      } catch (e) {
        console.log(`   ⚠️  Question text is not in JSON format yet`);
      }
    }

  } catch (error) {
    console.error('❌ Error adding Russian translations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  addRussianTranslations()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { addRussianTranslations };
