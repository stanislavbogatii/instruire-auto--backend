import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExistingData() {
  try {
    console.log('🔍 Checking existing database data...\n');

    // Check existing questions (probably practice data that should be exam data)
    const existingQuestions = await prisma.question.findMany({
      take: 5
    });
    console.log('📝 Sample existing questions:');
    existingQuestions.forEach(q => {
      console.log(`- Question ID: ${q.id}, Text: ${q.text?.substring(0, 50)}...`);
    });

    const totalQuestions = await prisma.question.count();
    console.log(`\n📊 Total existing questions: ${totalQuestions}`);

    // Check existing tickets
    const existingTickets = await prisma.ticket.findMany({
      take: 10,
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    console.log('\n🎫 Sample existing tickets:');
    existingTickets.forEach(t => {
      console.log(`- Ticket ID: ${t.id}, Name: ${t.name}, Questions: ${t._count.questions}`);
    });

    const totalTickets = await prisma.ticket.count();
    console.log(`\n📊 Total existing tickets: ${totalTickets}`);

    // Check ticket-question relationships
    const ticketQuestions = await prisma.ticketQuestion.count();
    console.log(`\n🔗 Total ticket-question relationships: ${ticketQuestions}`);

    // Check if exam tables have any data
    const examQuestions = await prisma.examQuestion.count();
    const examTickets = await prisma.examTicket.count();
    const exams = await prisma.exam.count();
    console.log(`\n🎯 Exams: ${exams}`);
    console.log(`🎯 Exam Questions: ${examQuestions}`);
    console.log(`🎯 Exam Tickets: ${examTickets}`);

    // Check student tickets (practice)
    const studentTickets = await prisma.studentTicket.count();
    console.log(`\n📚 Student Practice Tickets: ${studentTickets}`);

    // Check the structure of a sample question with ticket relations
    if (existingQuestions.length > 0) {
      const sampleQuestionWithTickets = await prisma.ticketQuestion.findFirst({
        include: {
          question: true,
          ticket: true
        }
      });
      console.log('\n🔬 Sample question-ticket relationship:');
      console.log(JSON.stringify(sampleQuestionWithTickets, null, 2));
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingData();
