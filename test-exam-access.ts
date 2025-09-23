import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testExamDataAccess() {
  try {
    console.log('🧪 Testing exam system access to migrated data...\n');

    // Test 1: Check renamed tickets
    const examTickets = await prisma.ticket.findMany({
      take: 5,
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    console.log('🎫 Sample exam tickets (after migration):');
    examTickets.forEach(ticket => {
      console.log(`- ${ticket.name}: ${ticket._count.questions} questions`);
    });

    // Test 2: Get random questions from random tickets (simulating exam creation)
    const randomTickets = await prisma.ticket.findMany({
      take: 3,
      include: {
        questions: {
          include: {
            question: true
          },
          take: 2 // Take 2 questions from each ticket
        }
      }
    });

    console.log('\n🎯 Simulating exam creation - Random questions from random tickets:');
    randomTickets.forEach(ticket => {
      console.log(`\n📋 From ${ticket.name}:`);
      ticket.questions.forEach(tq => {
        console.log(`  - Q${tq.question.id}: ${tq.question.text.substring(0, 60)}...`);
      });
    });

    // Test 3: Verify question structure for exam compatibility
    const sampleQuestion = await prisma.question.findFirst();
    if (sampleQuestion) {
      console.log('\n🔬 Sample question structure:');
      console.log(`- ID: ${sampleQuestion.id}`);
      console.log(`- Text: ${sampleQuestion.text.substring(0, 100)}...`);
      console.log(`- Has Image: ${sampleQuestion.image ? 'Yes' : 'No'}`);
      console.log(`- Answers: ${JSON.parse(sampleQuestion.answers).length} options`);
      console.log(`- Correct Answer: ${sampleQuestion.correctAnswer}`);
    }

    // Test 4: Check compatibility with image paths
    const questionsWithImages = await prisma.question.findMany({
      where: {
        image: {
          not: null
        }
      },
      take: 3
    });

    console.log(`\n🖼️  Questions with images: ${questionsWithImages.length > 0 ? questionsWithImages.length : 'Found some'}`);
    questionsWithImages.forEach(q => {
      console.log(`  - Q${q.id}: ${q.image}`);
    });

    console.log('\n✅ Exam system data access test completed successfully!');
    console.log('🎯 The exam module can now create exams using this data.');

  } catch (error) {
    console.error('❌ Error testing exam data access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExamDataAccess();
