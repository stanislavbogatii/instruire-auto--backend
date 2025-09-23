import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCorrectAnswers() {
  console.log('🧪 Testing correct answers integration...');
  
  try {
    // Test some specific questions from answers.json
    const testCases = [
      { bilet: 1, question_number: 1, expectedCorrectAnswer: 4 },
      { bilet: 1, question_number: 2, expectedCorrectAnswer: 2 },
      { bilet: 5, question_number: 10, expectedCorrectAnswer: null }, // Will check actual
      { bilet: 42, question_number: 24, expectedCorrectAnswer: null } // Will check actual
    ];

    for (const testCase of testCases) {
      const ticket = await prisma.ticket.findFirst({
        where: { name: `Practice Bilet ${testCase.bilet}` }
      });

      if (ticket) {
        const ticketQuestion = await prisma.ticketQuestion.findFirst({
          where: {
            ticketId: ticket.id,
            order: testCase.question_number
          },
          include: { question: true }
        });

        if (ticketQuestion) {
          const question = ticketQuestion.question;
          const answers = JSON.parse(question.answers);
          
          console.log(`\n📝 Bilet ${testCase.bilet}, Question ${testCase.question_number}:`);
          console.log(`   Text: ${question.text.substring(0, 80)}...`);
          console.log(`   Answers:`, answers);
          console.log(`   Correct Answer Index: ${question.correctAnswer} (0-based)`);
          console.log(`   Correct Answer Text: "${answers[question.correctAnswer]}"`);
          
          if (testCase.expectedCorrectAnswer) {
            const expected = testCase.expectedCorrectAnswer - 1; // Convert to 0-based
            const status = expected === question.correctAnswer ? '✅ PASS' : '❌ FAIL';
            console.log(`   Expected: ${expected}, Got: ${question.correctAnswer} - ${status}`);
          }
        }
      }
    }

    // Test API-like response format
    console.log('\n🔌 Simulating API Response Format:');
    const sampleQuestion = await prisma.question.findFirst({
      where: { correctAnswer: { not: 0 } } // Get a question with non-zero correct answer
    });

    if (sampleQuestion) {
      const apiResponse = {
        id: sampleQuestion.id,
        text: sampleQuestion.text,
        image: sampleQuestion.image,
        answers: JSON.parse(sampleQuestion.answers),
        correctAnswer: sampleQuestion.correctAnswer,
        imageUrl: sampleQuestion.image ? `https://instruireauto.site/images/${sampleQuestion.image}` : null,
        createdAt: sampleQuestion.createdAt,
        updatedAt: sampleQuestion.updatedAt
      };

      console.log('Sample API Response:', JSON.stringify(apiResponse, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectAnswers();