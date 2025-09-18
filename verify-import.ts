import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImportedData() {
  try {
    // Count totals
    const totalQuestions = await prisma.question.count();
    const totalTickets = await prisma.ticket.count();
    const totalTicketQuestions = await prisma.ticketQuestion.count();
    const questionsWithImages = await prisma.question.count({
      where: { image: { not: null } }
    });

    console.log('📊 Database Verification:');
    console.log(`   Total Questions: ${totalQuestions}`);
    console.log(`   Total Tickets: ${totalTickets}`);
    console.log(`   Total Ticket-Question Links: ${totalTicketQuestions}`);
    console.log(`   Questions with Images: ${questionsWithImages}`);

    // Sample a few tickets
    console.log('\n🎫 Sample Tickets:');
    const sampleTickets = await prisma.ticket.findMany({
      take: 5,
      include: {
        questions: {
          take: 3,
          include: {
            question: {
              select: {
                id: true,
                text: true,
                image: true,
                answers: true
              }
            }
          }
        }
      }
    });

    sampleTickets.forEach(ticket => {
      console.log(`\n   📚 ${ticket.name}:`);
      console.log(`      Questions in ticket: ${ticket.questions.length} (showing first 3)`);
      ticket.questions.forEach((tq, index) => {
        const hasImage = tq.question.image ? '🖼️' : '📝';
        const answers = JSON.parse(tq.question.answers);
        console.log(`      ${hasImage} Q${index + 1}: ${tq.question.text.substring(0, 80)}...`);
        console.log(`         Answers: ${answers.length} options`);
      });
    });

    // Check image distribution
    console.log('\n🖼️ Image Distribution by Bilet:');
    const imageStats = await prisma.$queryRaw`
      SELECT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(image, '/', 2), '/', -1) as bilet,
        COUNT(*) as count
      FROM Question 
      WHERE image IS NOT NULL 
      GROUP BY bilet 
      ORDER BY bilet;
    `;
    
    console.log(imageStats);

  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImportedData();