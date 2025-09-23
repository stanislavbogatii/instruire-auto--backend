import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface AnswerData {
  bilet: number;
  question_number: number;
  correctAnswer: number;
}

async function updateCorrectAnswers() {
  try {
    console.log('🔄 Starting to update correct answers...');

    // Read the answers.json file
    const answersData: AnswerData[] = JSON.parse(
      fs.readFileSync('/var/www/instruire-auto--backend/answers.json', 'utf8')
    );

    console.log(`📝 Found ${answersData.length} answers to process`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each answer
    for (const answerEntry of answersData) {
      try {
        const { bilet, question_number, correctAnswer } = answerEntry;
        
        // Find the ticket by name
        const ticketName = `Practice Bilet ${bilet}`;
        const ticket = await prisma.ticket.findFirst({
          where: { name: ticketName }
        });

        if (!ticket) {
          console.error(`❌ Ticket not found: ${ticketName}`);
          errorCount++;
          continue;
        }

        // Find the question by ticket and order
        const ticketQuestion = await prisma.ticketQuestion.findFirst({
          where: {
            ticketId: ticket.id,
            order: question_number
          }
        });

        if (!ticketQuestion) {
          console.error(`❌ Question not found: Ticket ${ticketName}, Order ${question_number}`);
          errorCount++;
          continue;
        }

        // Update the question with the correct answer
        // Note: Converting from 1-based to 0-based indexing
        const correctAnswerIndex = correctAnswer - 1;

        await prisma.question.update({
          where: { id: ticketQuestion.questionId },
          data: { correctAnswer: correctAnswerIndex }
        });

        updatedCount++;

        // Log progress every 50 updates
        if (updatedCount % 50 === 0) {
          console.log(`✅ Updated ${updatedCount} questions...`);
        }

      } catch (error) {
        console.error(`❌ Error processing bilet ${answerEntry.bilet}, question ${answerEntry.question_number}:`, error);
        errorCount++;
      }
    }

    console.log('\n🎉 Update completed!');
    console.log(`✅ Successfully updated: ${updatedCount} questions`);
    console.log(`❌ Errors encountered: ${errorCount} questions`);

    // Verify some updates
    console.log('\n🔍 Verification - checking some updated questions:');
    
    const verificationSamples = [
      { bilet: 1, question_number: 1, expectedAnswer: 4 },
      { bilet: 1, question_number: 2, expectedAnswer: 2 },
      { bilet: 2, question_number: 1, expectedAnswer: 5 },
      { bilet: 42, question_number: 24, expectedAnswer: answersData.find(a => a.bilet === 42 && a.question_number === 24)?.correctAnswer }
    ];

    for (const sample of verificationSamples) {
      if (!sample.expectedAnswer) continue;
      
      const ticket = await prisma.ticket.findFirst({
        where: { name: `Practice Bilet ${sample.bilet}` }
      });
      
      if (ticket) {
        const ticketQuestion = await prisma.ticketQuestion.findFirst({
          where: { ticketId: ticket.id, order: sample.question_number },
          include: { question: true }
        });
        
        if (ticketQuestion) {
          const expected = sample.expectedAnswer - 1; // Convert to 0-based
          const actual = ticketQuestion.question.correctAnswer;
          const status = expected === actual ? '✅' : '❌';
          console.log(`${status} Bilet ${sample.bilet}, Q${sample.question_number}: Expected ${expected}, Got ${actual}`);
        }
      }
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
if (require.main === module) {
  updateCorrectAnswers()
    .then(() => {
      console.log('✅ Update script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Update script failed:', error);
      process.exit(1);
    });
}

export { updateCorrectAnswers };