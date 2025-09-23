import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface QuestionData {
  bilet: number;
  question_number: number;
  correct_answer: number;
  question: {
    ro: string;
    ru?: string;
  };
  answers: Array<{
    ro: string;
    ru?: string;
  }>;
}

interface JsonData {
  questions: QuestionData[];
}

async function updateCorrectAnswers() {
  try {
    console.log('🔄 Starting correct answer update process...\n');

    // Step 1: Read the JSON file
    console.log('📖 Reading JSON file...');
    const jsonContent = fs.readFileSync('/var/www/instruire-auto--backend/instruire_auto_json.json', 'utf-8');
    const data: JsonData = JSON.parse(jsonContent);
    
    console.log(`📝 Loaded ${data.questions.length} questions from JSON file`);

    // Step 2: Get all tickets and questions from database
    console.log('🗄️  Fetching database data...');
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
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Found ${tickets.length} tickets in database`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Step 3: Process each ticket
    for (const ticket of tickets) {
      // Extract ticket number from name (e.g., "Bilet 1" -> 1)
      const ticketMatch = ticket.name.match(/Bilet (\d+)/);
      if (!ticketMatch) {
        console.log(`⚠️  Skipping ticket "${ticket.name}" - invalid name format`);
        continue;
      }

      const ticketNumber = parseInt(ticketMatch[1]);
      console.log(`\n🎫 Processing ${ticket.name} (${ticket.questions.length} questions)`);

      // Step 4: Process each question in the ticket
      for (const ticketQuestion of ticket.questions) {
        try {
          // Find corresponding question in JSON data
          const jsonQuestion = data.questions.find(q => 
            q.bilet === ticketNumber && 
            q.question_number === ticketQuestion.order
          );

          if (!jsonQuestion) {
            console.log(`  ⚠️  No JSON data found for Bilet ${ticketNumber}, Question ${ticketQuestion.order}`);
            skippedCount++;
            continue;
          }

          // Update the correct answer if it's different
          const currentCorrectAnswer = ticketQuestion.question.correctAnswer;
          const newCorrectAnswer = jsonQuestion.correct_answer;

          if (currentCorrectAnswer !== newCorrectAnswer) {
            await prisma.question.update({
              where: { id: ticketQuestion.question.id },
              data: { correctAnswer: newCorrectAnswer }
            });

            console.log(`  ✅ Updated Q${ticketQuestion.order}: ${currentCorrectAnswer} → ${newCorrectAnswer}`);
            updatedCount++;
          } else {
            console.log(`  ✓ Q${ticketQuestion.order}: Already correct (${currentCorrectAnswer})`);
          }

        } catch (error) {
          console.error(`  ❌ Error updating Q${ticketQuestion.order}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n📋 Final Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} questions`);
    console.log(`⏭️  Skipped: ${skippedCount} questions (no JSON match)`);
    console.log(`❌ Errors: ${errorCount} questions`);
    console.log(`📊 Total processed: ${updatedCount + skippedCount + errorCount} questions`);

    // Step 5: Verification - check a few random questions
    console.log('\n🔍 Verification - Random sample check:');
    const sampleQuestions = await prisma.$queryRaw`
      SELECT q.id, q.text, q.correctAnswer, t.name as ticketName, tq.\`order\`
      FROM Question q
      JOIN TicketQuestion tq ON tq.questionId = q.id
      JOIN Ticket t ON t.id = tq.ticketId
      ORDER BY RAND()
      LIMIT 5
    ` as any[];

    for (const q of sampleQuestions) {
      const ticketNumber = parseInt(q.ticketName.match(/Bilet (\d+)/)?.[1] || '0');
      const jsonQ = data.questions.find(jq => 
        jq.bilet === ticketNumber && 
        jq.question_number === q.order
      );
      
      const status = jsonQ && jsonQ.correct_answer === q.correctAnswer ? '✅' : '❌';
      console.log(`  ${status} ${q.ticketName} Q${q.order}: DB=${q.correctAnswer}, JSON=${jsonQ?.correct_answer || 'N/A'}`);
    }

    console.log('\n🎯 Update completed successfully!');

  } catch (error) {
    console.error('❌ Error during update process:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update immediately
console.log('🚀 Starting correct answer update based on instruire_auto_json.json\n');
updateCorrectAnswers().catch(console.error);
