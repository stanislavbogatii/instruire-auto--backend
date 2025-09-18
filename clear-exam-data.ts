import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearExamData() {
  try {
    console.log('🧹 Clearing duplicate exam data...');

    // Delete in proper order due to foreign key constraints
    console.log('   Deleting TicketQuestions...');
    await prisma.ticketQuestion.deleteMany({});

    console.log('   Deleting Questions...');
    await prisma.question.deleteMany({});

    console.log('   Deleting Tickets...');
    await prisma.ticket.deleteMany({});

    // Also clear any exam-related data
    console.log('   Deleting ExamQuestions...');
    await prisma.examQuestion.deleteMany({});

    console.log('   Deleting ExamTickets...');
    await prisma.examTicket.deleteMany({});

    console.log('   Deleting StudentTickets...');
    await prisma.studentTicket.deleteMany({});

    console.log('   Deleting Exams...');
    await prisma.exam.deleteMany({});

    console.log('✅ Database cleared successfully!');

    // Verify counts
    const counts = {
      questions: await prisma.question.count(),
      tickets: await prisma.ticket.count(),
      ticketQuestions: await prisma.ticketQuestion.count(),
    };

    console.log('📊 Current counts:', counts);

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearExamData();