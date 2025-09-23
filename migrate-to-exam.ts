import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToExamSystem() {
  try {
    console.log('🚀 Starting migration from practice to exam system...\n');

    // Step 1: Check if exam data already exists
    const existingExamQuestions = await prisma.examQuestion.count();
    const existingExamTickets = await prisma.examTicket.count();
    
    if (existingExamQuestions > 0 || existingExamTickets > 0) {
      console.log('⚠️  Exam data already exists! Skipping migration to avoid duplicates.');
      console.log(`Current exam questions: ${existingExamQuestions}`);
      console.log(`Current exam tickets: ${existingExamTickets}`);
      return;
    }

    // Step 2: Get all tickets and their questions
    const allTickets = await prisma.ticket.findMany({
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

    console.log(`📊 Found ${allTickets.length} tickets to migrate`);

    // Step 3: Rename tickets from "Practice Bilet X" to "Bilet X"
    console.log('\n📝 Updating ticket names...');
    for (const ticket of allTickets) {
      const newName = ticket.name.replace('Practice ', '');
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { name: newName }
      });
      console.log(`✅ Updated: "${ticket.name}" → "${newName}"`);
    }

    // Step 4: No need to duplicate questions since they can be shared between practice and exam
    // The Question model will be used by both systems

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Questions: ${await prisma.question.count()} (shared between practice and exam)`);
    console.log(`- Tickets: ${allTickets.length} (renamed for exam use)`);
    console.log(`- Ticket-Question relationships: ${await prisma.ticketQuestion.count()}`);
    
    console.log('\n🎯 The exam system can now use these questions and tickets!');
    console.log('The questions will be dynamically selected from these tickets during exam creation.');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run with confirmation
console.log('🔄 This script will migrate practice data to be usable by the exam system.');
console.log('📝 It will rename tickets from "Practice Bilet X" to "Bilet X"');
console.log('📚 Questions will remain shared between practice and exam systems');
console.log('\nStarting migration in 3 seconds...\n');

setTimeout(() => {
  migrateToExamSystem().catch(console.error);
}, 3000);
