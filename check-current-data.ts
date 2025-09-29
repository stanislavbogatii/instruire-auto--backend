import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentData() {
  try {
    console.log('🔍 Checking current database state...\n');

    // Count all entities
    const questionCount = await prisma.question.count();
    const ticketCount = await prisma.ticket.count();
    const ticketQuestionCount = await prisma.ticketQuestion.count();
    const examCount = await prisma.exam.count();
    const examQuestionCount = await prisma.examQuestion.count();
    const examTicketCount = await prisma.examTicket.count();
    const studentTicketCount = await prisma.studentTicket.count();
    const studentTicketAnswerCount = await prisma.studentTicketAnswer.count();

    console.log('📊 Current Database Counts:');
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Tickets: ${ticketCount}`);
    console.log(`   TicketQuestions: ${ticketQuestionCount}`);
    console.log(`   Exams: ${examCount}`);
    console.log(`   ExamQuestions: ${examQuestionCount}`);
    console.log(`   ExamTickets: ${examTicketCount}`);
    console.log(`   StudentTickets: ${studentTicketCount}`);
    console.log(`   StudentTicketAnswers: ${studentTicketAnswerCount}`);

    // Check if there are any foreign key dependencies
    if (examCount > 0 || examQuestionCount > 0 || examTicketCount > 0 || 
        studentTicketCount > 0 || studentTicketAnswerCount > 0) {
      console.log('\n⚠️  WARNING: Found dependencies on questions/tickets:');
      if (examCount > 0) console.log(`   - ${examCount} exams exist`);
      if (examQuestionCount > 0) console.log(`   - ${examQuestionCount} exam questions exist`);
      if (examTicketCount > 0) console.log(`   - ${examTicketCount} exam tickets exist`);
      if (studentTicketCount > 0) console.log(`   - ${studentTicketCount} student tickets exist`);
      if (studentTicketAnswerCount > 0) console.log(`   - ${studentTicketAnswerCount} student ticket answers exist`);
      console.log('   These will need to be handled during replacement.');
    }

    // Sample some questions to see current structure
    if (questionCount > 0) {
      console.log('\n📝 Sample Questions:');
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
        console.log(`   ${i + 1}. ID: ${q.id}, Text: "${q.text.substring(0, 50)}..."`);
        console.log(`      Answers: ${JSON.parse(q.answers).length} options`);
        console.log(`      CorrectAnswer: ${q.correctAnswer}`);
        console.log(`      Image: ${q.image || 'None'}`);
        console.log(`      Used in tickets: ${q.ticketQuestions.map(tq => tq.ticket.name).join(', ')}\n`);
      });
    }

    // Sample tickets
    if (ticketCount > 0) {
      console.log('🎫 Sample Tickets:');
      const sampleTickets = await prisma.ticket.findMany({
        take: 5,
        include: {
          questions: true
        }
      });

      sampleTickets.forEach(ticket => {
        console.log(`   - ${ticket.name} (${ticket.type}): ${ticket.questions.length} questions`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkCurrentData();
}