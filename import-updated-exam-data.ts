import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface QuestionData {
  bilet: number;
  question_number: number;
  correct_answer: number;
  question: {
    ro: string;
    ru: string;
  };
  answers: Array<{
    ro: string;
    ru: string;
  }>;
}

interface ImportData {
  questions: QuestionData[];
}

async function importUpdatedExamData() {
  try {
    console.log('🚀 Starting updated exam data import...');

    // Check current database state
    const existingQuestions = await prisma.question.count();
    const existingTickets = await prisma.ticket.count();
    const existingExams = await prisma.exam.count();
    const existingExamQuestions = await prisma.examQuestion.count();
    const existingExamTickets = await prisma.examTicket.count();
    
    console.log(`📊 Current database state:`);
    console.log(`   Questions: ${existingQuestions}`);
    console.log(`   Tickets: ${existingTickets}`);
    console.log(`   Exams: ${existingExams}`);
    console.log(`   ExamQuestions: ${existingExamQuestions}`);
    console.log(`   ExamTickets: ${existingExamTickets}`);

    if (existingExams > 0 || existingExamQuestions > 0 || existingExamTickets > 0) {
      console.log('\n⚠️  WARNING: Found existing exam dependencies!');
      console.log('We will need to clear these before replacing questions/tickets.');
      
      const clearDependencies = process.argv.includes('--clear-dependencies');
      if (!clearDependencies) {
        console.log('\n❌ Please run with --clear-dependencies flag to clear exam data first:');
        console.log('   npx ts-node import-updated-exam-data.ts --clear-dependencies');
        console.log('\n📋 This will:');
        console.log('   1. Delete all Exam records');
        console.log('   2. Delete all ExamQuestion records');
        console.log('   3. Delete all ExamTicket records');
        console.log('   4. Replace all Questions and Tickets with new data');
        return;
      }

      console.log('\n🧹 Clearing exam dependencies...');
      
      // Clear dependencies in correct order due to foreign keys
      await prisma.examQuestion.deleteMany({});
      console.log('   ✅ Cleared ExamQuestions');
      
      await prisma.examTicket.deleteMany({});
      console.log('   ✅ Cleared ExamTickets');
      
      await prisma.exam.deleteMany({});
      console.log('   ✅ Cleared Exams');
    }

    // Read the updated JSON file
    const jsonPath = path.join(process.cwd(), 'instruire_auto_json.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ImportData;
    console.log(`\n📚 Found ${jsonData.questions.length} questions in updated JSON`);

    // Group questions by bilet
    const questionsByBilet = new Map<number, QuestionData[]>();
    jsonData.questions.forEach(q => {
      if (!questionsByBilet.has(q.bilet)) {
        questionsByBilet.set(q.bilet, []);
      }
      questionsByBilet.get(q.bilet)!.push(q);
    });

    console.log(`🎫 Found ${questionsByBilet.size} billets (B1-B${Math.max(...questionsByBilet.keys())})`);

    // Validate data before proceeding
    console.log('\n🔍 Validating new data...');
    let totalQuestions = 0;
    let questionsWithImages = 0;
    const validationErrors: string[] = [];

    for (const [biletNumber, questions] of questionsByBilet) {
      totalQuestions += questions.length;
      
      for (const questionData of questions) {
        // Validate correct_answer is within valid range
        const numAnswers = questionData.answers.length;
        if (questionData.correct_answer < 1 || questionData.correct_answer > numAnswers) {
          validationErrors.push(`B${biletNumber}Q${questionData.question_number}: correct_answer ${questionData.correct_answer} is not in range 1-${numAnswers}`);
        }

        // Check if question has text
        if (!questionData.question.ro || questionData.question.ro.trim() === '') {
          validationErrors.push(`B${biletNumber}Q${questionData.question_number}: missing Romanian question text`);
        }

        // Check if answers exist
        if (numAnswers < 2) {
          validationErrors.push(`B${biletNumber}Q${questionData.question_number}: insufficient answers (${numAnswers})`);
        }

        // Check for images
        const questionDir = path.join(process.cwd(), `EXAMEN_INSTRUIRE_AUTO/B${biletNumber}/${questionData.question_number}`);
        if (fs.existsSync(questionDir)) {
          const files = fs.readdirSync(questionDir);
          const hasImage = files.some(file => 
            file.toLowerCase().endsWith('.jpeg') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.png')
          );
          if (hasImage) questionsWithImages++;
        }
      }
    }

    if (validationErrors.length > 0) {
      console.log(`\n❌ Validation errors found (${validationErrors.length}):`);
      validationErrors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
      if (validationErrors.length > 10) {
        console.log(`   ... and ${validationErrors.length - 10} more errors`);
      }
      throw new Error('Data validation failed');
    }

    console.log(`✅ Validation passed:`);
    console.log(`   - ${totalQuestions} total questions`);
    console.log(`   - ${questionsWithImages} questions with images`);
    console.log(`   - ${questionsByBilet.size} billets`);

    // Start replacement process
    console.log('\n🔄 Starting data replacement...');

    await prisma.$transaction(async (tx) => {
      // Clear existing questions and tickets
      console.log('   🧹 Clearing existing TicketQuestions...');
      await tx.ticketQuestion.deleteMany({});
      
      console.log('   🧹 Clearing existing Questions...');
      await tx.question.deleteMany({});
      
      console.log('   🧹 Clearing existing Tickets...');
      await tx.ticket.deleteMany({});

      let questionCount = 0;
      let ticketCount = 0;

      // Process each bilet
      for (const [biletNumber, questions] of questionsByBilet) {
        console.log(`\n   📝 Processing Bilet ${biletNumber} with ${questions.length} questions...`);

        // Determine ticket type - let's make PRACTICE type for now
        // You can change this logic based on your needs
        const ticketType = 'PRACTICE'; // or 'EXAM' based on some criteria

        // Create ticket for this bilet
        const ticket = await tx.ticket.create({
          data: {
            name: `Bilet ${biletNumber}`,
            type: ticketType,
          },
        });
        ticketCount++;

        // Sort questions by question_number to maintain order
        const sortedQuestions = questions.sort((a, b) => a.question_number - b.question_number);

        // Process questions in this bilet
        for (const [index, questionData] of sortedQuestions.entries()) {
          // Check for image
          let imagePath: string | null = null;
          const questionDir = path.join(process.cwd(), `EXAMEN_INSTRUIRE_AUTO/B${biletNumber}/${questionData.question_number}`);
          
          if (fs.existsSync(questionDir)) {
            const files = fs.readdirSync(questionDir);
            const imageFile = files.find(file => 
              file.toLowerCase().endsWith('.jpeg') || 
              file.toLowerCase().endsWith('.jpg') || 
              file.toLowerCase().endsWith('.png')
            );
            
            if (imageFile) {
              imagePath = `EXAMEN_INSTRUIRE_AUTO/B${biletNumber}/${questionData.question_number}/${imageFile}`;
            }
          }

          // Prepare answers array (using Romanian for now)
          const answersArray = questionData.answers.map(answer => answer.ro);

          // Use Romanian question text as primary
          const questionText = questionData.question.ro;

          // Use the correct_answer from JSON (adjust from 1-based to 0-based indexing)
          const correctAnswer = questionData.correct_answer - 1;

          // Create the question
          const question = await tx.question.create({
            data: {
              text: questionText,
              image: imagePath,
              answers: JSON.stringify(answersArray),
              correctAnswer: correctAnswer,
            },
          });

          // Link question to ticket with proper order
          await tx.ticketQuestion.create({
            data: {
              ticketId: ticket.id,
              questionId: question.id,
              order: index + 1,
            },
          });

          questionCount++;

          if (questionCount % 100 === 0) {
            console.log(`      📊 Processed ${questionCount} questions...`);
          }
        }

        console.log(`      🎫 Created ticket "${ticket.name}" (${ticketType}) with ${questions.length} questions`);
      }

      console.log(`\n   ✅ Transaction completed:`);
      console.log(`      - Questions imported: ${questionCount}`);
      console.log(`      - Tickets created: ${ticketCount}`);
    });

    // Final verification
    const newQuestionCount = await prisma.question.count();
    const newTicketCount = await prisma.ticket.count();
    const newTicketQuestionCount = await prisma.ticketQuestion.count();
    
    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📊 Final Summary:`);
    console.log(`   - Questions in database: ${newQuestionCount}`);
    console.log(`   - Tickets in database: ${newTicketCount}`);
    console.log(`   - TicketQuestions in database: ${newTicketQuestionCount}`);
    
    // Count questions with images
    const questionsWithImagesCount = await prisma.question.count({
      where: {
        image: {
          not: null
        }
      }
    });
    console.log(`   - Questions with images: ${questionsWithImagesCount}`);

    // Show sample of updated data
    console.log(`\n📝 Sample of imported questions:`);
    const sampleQuestions = await prisma.question.findMany({
      take: 3,
      include: {
        ticketQuestions: {
          include: {
            ticket: true
          }
        }
      }
    });

    sampleQuestions.forEach((q, i) => {
      const answers = JSON.parse(q.answers);
      console.log(`   ${i + 1}. "${q.text.substring(0, 50)}..."`);
      console.log(`      Answers: ${answers.length} options, Correct: ${q.correctAnswer + 1}`);
      console.log(`      Ticket: ${q.ticketQuestions.map(tq => tq.ticket.name).join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importUpdatedExamData()
    .then(() => {
      console.log('✅ Import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import script failed:', error);
      process.exit(1);
    });
}

export { importUpdatedExamData };