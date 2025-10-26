import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRussianTranslations() {
  try {
    console.log('🔍 Verifying Russian translations in database...\n');

    // Count total questions
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions in database: ${totalQuestions}\n`);

    // Get sample from EXAM questions
    console.log('🎓 EXAM Questions Sample:');
    const examTicket = await prisma.ticket.findFirst({
      where: { type: 'EXAM' },
      include: {
        questions: {
          include: { question: true },
          take: 2,
          orderBy: { order: 'asc' }
        }
      }
    });

    if (examTicket) {
      console.log(`   Ticket: ${examTicket.name}`);
      examTicket.questions.forEach((tq, idx) => {
        const q = tq.question;
        try {
          const questionText = JSON.parse(q.text);
          const answers = JSON.parse(q.answers);
          
          console.log(`\n   Question ${idx + 1}:`);
          console.log(`   📝 RO: ${questionText.ro.substring(0, 60)}...`);
          console.log(`   🇷🇺 RU: ${questionText.ru.substring(0, 60)}...`);
          console.log(`   Answers (${answers.length} options):`);
          answers.forEach((ans: any, i: number) => {
            console.log(`      ${i + 1}. RO: ${ans.ro.substring(0, 50)}...`);
            console.log(`         RU: ${ans.ru.substring(0, 50)}...`);
          });
          console.log(`   ✅ Correct answer: ${q.correctAnswer + 1}`);
        } catch (e) {
          console.log(`   ❌ Question ${idx + 1} is not in multilingual format!`);
        }
      });
    }

    // Get sample from PRACTICE questions
    console.log('\n\n📚 PRACTICE Questions Sample:');
    const practiceTicket = await prisma.ticket.findFirst({
      where: { type: 'PRACTICE' },
      include: {
        questions: {
          include: { question: true },
          take: 2,
          orderBy: { order: 'asc' }
        }
      }
    });

    if (practiceTicket) {
      console.log(`   Ticket: ${practiceTicket.name}`);
      practiceTicket.questions.forEach((tq, idx) => {
        const q = tq.question;
        try {
          const questionText = JSON.parse(q.text);
          const answers = JSON.parse(q.answers);
          
          console.log(`\n   Question ${idx + 1}:`);
          console.log(`   📝 RO: ${questionText.ro.substring(0, 60)}...`);
          console.log(`   🇷🇺 RU: ${questionText.ru.substring(0, 60)}...`);
          console.log(`   Answers (${answers.length} options):`);
          answers.forEach((ans: any, i: number) => {
            console.log(`      ${i + 1}. RO: ${ans.ro.substring(0, 50)}...`);
            console.log(`         RU: ${ans.ru.substring(0, 50)}...`);
          });
          console.log(`   ✅ Correct answer: ${q.correctAnswer + 1}`);
        } catch (e) {
          console.log(`   ❌ Question ${idx + 1} is not in multilingual format!`);
        }
      });
    }

    // Check if all questions have Russian translations
    console.log('\n\n🔍 Checking all questions for Russian translations...');
    
    const allQuestions = await prisma.question.findMany({
      take: 100 // Check first 100
    });

    let validCount = 0;
    let invalidCount = 0;

    for (const q of allQuestions) {
      try {
        const questionText = JSON.parse(q.text);
        const answers = JSON.parse(q.answers);
        
        if (questionText.ro && questionText.ru && answers.length > 0) {
          const allAnswersValid = answers.every((a: any) => a.ro && a.ru);
          if (allAnswersValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        } else {
          invalidCount++;
        }
      } catch {
        invalidCount++;
      }
    }

    console.log(`   ✅ Valid multilingual questions: ${validCount}/${allQuestions.length}`);
    console.log(`   ❌ Invalid or missing translations: ${invalidCount}/${allQuestions.length}`);

    // Summary by ticket type
    console.log('\n\n📈 Summary by Type:');
    
    const examTicketsCount = await prisma.ticket.count({
      where: { type: 'EXAM' }
    });
    
    const practiceTicketsCount = await prisma.ticket.count({
      where: { type: 'PRACTICE' }
    });

    console.log(`   🎓 EXAM tickets: ${examTicketsCount}`);
    console.log(`   📚 PRACTICE tickets: ${practiceTicketsCount}`);

    // Count questions by type
    const examQuestionsCount = await prisma.ticketQuestion.count({
      where: {
        ticket: { type: 'EXAM' }
      }
    });

    const practiceQuestionsCount = await prisma.ticketQuestion.count({
      where: {
        ticket: { type: 'PRACTICE' }
      }
    });

    console.log(`   🎓 EXAM questions: ${examQuestionsCount}`);
    console.log(`   📚 PRACTICE questions: ${practiceQuestionsCount}`);

    console.log('\n✅ Verification completed!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Update your API endpoints to parse the JSON text field');
    console.log('   2. Add a language parameter to API requests (ro/ru)');
    console.log('   3. In your frontend, extract the appropriate language:');
    console.log('      const questionText = JSON.parse(question.text);');
    console.log('      const displayText = questionText[selectedLanguage]; // "ro" or "ru"');
    console.log('      const answers = JSON.parse(question.answers);');
    console.log('      const displayAnswers = answers.map(a => a[selectedLanguage]);');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyRussianTranslations()
    .then(() => {
      console.log('✨ Verification completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyRussianTranslations };
