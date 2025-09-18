import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking actual database structure...');

    // Try to query the StudentTicket table directly to see what columns exist
    const result = await prisma.$queryRaw`SHOW COLUMNS FROM StudentTicket`;
    console.log('📋 StudentTicket columns:', result);

    // Check if StudentTicketAnswer table exists
    try {
      const answerResult = await prisma.$queryRaw`SHOW COLUMNS FROM StudentTicketAnswer`;
      console.log('📋 StudentTicketAnswer columns:', answerResult);
    } catch (error) {
      console.log('❌ StudentTicketAnswer table does not exist');
    }

    // Count existing data
    const counts = {
      questions: await prisma.question.count(),
      tickets: await prisma.ticket.count(),
      users: await prisma.user.count(),
    };

    console.log('\n📊 Data safety check:');
    console.log(`   Questions: ${counts.questions} ✅`);
    console.log(`   Tickets: ${counts.tickets} ✅`);
    console.log(`   Users: ${counts.users} ✅`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();