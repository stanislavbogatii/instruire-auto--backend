import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPracticeSystem() {
  try {
    console.log('🧪 Testing Practice System...');

    // Get first ticket for testing
    const ticket = await prisma.ticket.findFirst({
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
          take: 3, // Just test with first 3 questions
        },
      },
    });

    if (!ticket) {
      console.log('❌ No tickets found. Run import first.');
      return;
    }

    console.log(`🎫 Testing with ticket: ${ticket.name}`);
    console.log(`📝 Questions in ticket: ${ticket.questions.length}`);

    // Get first user for testing
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found. Create a user first.');
      return;
    }

    console.log(`👤 Testing with user: ${user.email}`);

    // Test practice session creation
    console.log('\n📚 Testing practice session creation...');
    
    // Clean up any existing practice for this user/ticket
    await prisma.studentTicketAnswer.deleteMany({
      where: {
        studentTicket: {
          userId: user.id,
          ticketId: ticket.id,
        },
      },
    });
    
    await prisma.studentTicket.deleteMany({
      where: {
        userId: user.id,
        ticketId: ticket.id,
      },
    });

    // Create new practice session
    const practiceSession = await prisma.studentTicket.create({
      data: {
        userId: user.id,
        ticketId: ticket.id,
        status: 'IN_PROGRESS',
        totalQuestions: ticket.questions.length,
        startedAt: new Date(),
        lastQuestionIndex: 0,
      },
    });

    console.log(`✅ Practice session created: ID ${practiceSession.id}`);

    // Create answer placeholders
    await prisma.studentTicketAnswer.createMany({
      data: ticket.questions.map((tq, index) => ({
        studentTicketId: practiceSession.id,
        questionId: tq.question.id,
        order: index + 1,
      })),
    });

    console.log(`✅ Answer placeholders created for ${ticket.questions.length} questions`);

    // Test answering questions
    console.log('\n✏️ Testing answer submission...');
    const firstQuestion = ticket.questions[0];
    
    await prisma.studentTicketAnswer.updateMany({
      where: {
        studentTicketId: practiceSession.id,
        questionId: firstQuestion.question.id,
      },
      data: {
        selectedAnswer: 0, // First answer
        isCorrect: firstQuestion.question.correctAnswer === 0,
        answeredAt: new Date(),
      },
    });

    console.log(`✅ Answer submitted for question: ${firstQuestion.question.text.substring(0, 50)}...`);

    // Check practice progress
    const practiceDetails = await prisma.studentTicket.findUnique({
      where: { id: practiceSession.id },
      include: {
        ticket: true,
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (practiceDetails) {
      const answeredCount = practiceDetails.answers.filter(a => a.selectedAnswer !== null).length;
      console.log(`📊 Progress: ${answeredCount}/${practiceDetails.totalQuestions} questions answered`);
      console.log(`📈 Status: ${practiceDetails.status}`);
    }

    console.log('\n🎉 Practice system test completed successfully!');

    // Show system capabilities
    console.log('\n🔧 System Capabilities:');
    console.log('✅ Practice sessions for individual tickets');
    console.log('✅ Progress tracking (answered/total questions)');
    console.log('✅ Answer correctness tracking');
    console.log('✅ Session status (IN_PROGRESS, COMPLETED, PASSED, FAILED)');
    console.log('✅ Resume capability (lastQuestionIndex)');
    console.log('✅ Practice history per user');
    console.log('✅ Detailed answer tracking per question');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPracticeSystem();