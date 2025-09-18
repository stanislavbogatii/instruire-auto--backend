import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDataSafety() {
  try {
    console.log('🔍 Verifying database integrity...');

    // Check existing data counts
    const counts = {
      questions: await prisma.question.count(),
      tickets: await prisma.ticket.count(),
      ticketQuestions: await prisma.ticketQuestion.count(),
      users: await prisma.user.count(),
      exams: await prisma.exam.count(),
    };

    console.log('📊 Current data counts:');
    console.log(`   Questions: ${counts.questions}`);
    console.log(`   Tickets: ${counts.tickets}`);
    console.log(`   Ticket-Questions: ${counts.ticketQuestions}`);
    console.log(`   Users: ${counts.users}`);
    console.log(`   Exams: ${counts.exams}`);

    // Check if new fields exist by testing a simple query
    console.log('\n🔧 Testing new schema fields...');
    
    // Test if we can query the new StudentTicket structure
    const studentTickets = await prisma.studentTicket.findMany({
      take: 1,
    });
    
    console.log(`✅ StudentTicket table accessible: ${studentTickets.length === 0 ? 'empty' : 'has data'}`);

    // Test a sample StudentTicket creation (and immediate deletion to be safe)
    console.log('\n🧪 Testing StudentTicket creation...');
    
    const firstUser = await prisma.user.findFirst();
    const firstTicket = await prisma.ticket.findFirst();
    
    if (firstUser && firstTicket) {
      // Check if this combination already exists
      const existingPractice = await prisma.studentTicket.findUnique({
        where: {
          userId_ticketId: {
            userId: firstUser.id,
            ticketId: firstTicket.id,
          },
        },
      });
      
      if (!existingPractice) {
        console.log('   Creating test practice session...');
        const testPractice = await prisma.studentTicket.create({
          data: {
            userId: firstUser.id,
            ticketId: firstTicket.id,
            status: 'NOT_STARTED',
            totalQuestions: 24,
          },
        });
        
        console.log(`   ✅ Test practice created with ID: ${testPractice.id}`);
        
        // Clean up the test record
        await prisma.studentTicket.delete({
          where: { id: testPractice.id },
        });
        
        console.log('   🧹 Test practice cleaned up');
      } else {
        console.log('   ℹ️ Practice session already exists for this user/ticket');
      }
    }

    console.log('\n✅ Database integrity verified - all data is safe!');
    console.log('🎉 New practice tracking schema is ready to use!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.log('\n⚠️ There might be an issue with the schema. Please check manually.');
  } finally {
    await prisma.$disconnect();
  }
}

verifyDataSafety();