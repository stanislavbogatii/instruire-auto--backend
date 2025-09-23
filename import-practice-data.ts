import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PracticeQuestion {
  bilet: number;
  question_number: number;
  question: {
    ro: string;
    ru: string;
  };
  answers: Array<{
    ro: string;
    ru: string;
  }>;
  correctAnswer: number;
  image: string;
}

interface PracticeData {
  questions: PracticeQuestion[];
}

async function importPracticeData() {
  try {
    console.log('🚀 Starting practice data import...');
    
    // Read the practice.json file
    const filePath = path.join(__dirname, 'practice.json');
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const practiceData: PracticeData = JSON.parse(jsonData);
    
    console.log(`📊 Found ${practiceData.questions.length} questions`);
    
    // Group questions by ticket (bilet)
    const questionsByTicket = new Map<number, PracticeQuestion[]>();
    
    practiceData.questions.forEach(q => {
      if (!questionsByTicket.has(q.bilet)) {
        questionsByTicket.set(q.bilet, []);
      }
      questionsByTicket.get(q.bilet)!.push(q);
    });
    
    console.log(`📋 Found ${questionsByTicket.size} practice tickets`);
    
    // Start transaction
    await prisma.$transaction(async (tx) => {
      console.log('💾 Starting database transaction...');
      
      // Import questions and create tickets
      for (const [ticketNumber, questions] of questionsByTicket.entries()) {
        console.log(`\n🎯 Processing Practice Ticket P${ticketNumber} with ${questions.length} questions`);
        
        // Create the practice ticket
        const ticket = await tx.ticket.create({
          data: {
            name: `Practice P${ticketNumber}`,
            type: 'PRACTICE'
          }
        });
        
        console.log(`✅ Created ticket: ${ticket.name} (ID: ${ticket.id})`);
        
        // Sort questions by question_number to maintain order
        const sortedQuestions = questions.sort((a, b) => a.question_number - b.question_number);
        
        // Process each question
        for (let index = 0; index < sortedQuestions.length; index++) {
          const q = sortedQuestions[index];
          
          // Create question
          const question = await tx.question.create({
            data: {
              text: q.question.ro,
              image: q.image || null,
              answers: JSON.stringify(q.answers.map(a => a.ro)),
              correctAnswer: q.correctAnswer
            }
          });
          
          // Link question to ticket with proper order
          await tx.ticketQuestion.create({
            data: {
              ticketId: ticket.id,
              questionId: question.id,
              order: index + 1
            }
          });
          
          // Log progress every 5 questions
          if ((index + 1) % 5 === 0) {
            console.log(`   📝 Processed ${index + 1}/${sortedQuestions.length} questions`);
          }
        }
        
        console.log(`✅ Completed Practice Ticket P${ticketNumber}`);
      }
    });
    
    console.log('\n🎉 Practice data import completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${practiceData.questions.length} questions imported`);
    console.log(`   • ${questionsByTicket.size} practice tickets created`);
    console.log('   • All questions linked to their respective tickets');
    console.log('   • All tickets marked as type: PRACTICE');
    
    // Verify the import
    const practiceTicketsCount = await prisma.ticket.count({
      where: { type: 'PRACTICE' }
    });
    
    const totalQuestionsCount = await prisma.question.count();
    
    console.log('\n🔍 Verification:');
    console.log(`   • Practice tickets in DB: ${practiceTicketsCount}`);
    console.log(`   • Total questions in DB: ${totalQuestionsCount}`);
    
  } catch (error) {
    console.error('❌ Error importing practice data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importPracticeData()
  .then(() => {
    console.log('✨ Import process finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
