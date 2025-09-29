import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTicketTypes() {
  try {
    console.log('🔄 Updating some tickets to EXAM type...');

    // Update first 20 tickets to be EXAM type (for exam functionality)
    // Keep the rest as PRACTICE type
    const examTicketsToUpdate = await prisma.ticket.findMany({
      take: 20,
      orderBy: { id: 'asc' }
    });

    console.log(`📝 Updating ${examTicketsToUpdate.length} tickets to EXAM type...`);

    for (const ticket of examTicketsToUpdate) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { type: 'EXAM' }
      });
    }

    // Check final counts
    const examCount = await prisma.ticket.count({ where: { type: 'EXAM' } });
    const practiceCount = await prisma.ticket.count({ where: { type: 'PRACTICE' } });

    console.log(`✅ Update completed:`);
    console.log(`   - EXAM tickets: ${examCount}`);
    console.log(`   - PRACTICE tickets: ${practiceCount}`);
    console.log(`   - Total tickets: ${examCount + practiceCount}`);

  } catch (error) {
    console.error('❌ Error updating ticket types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  updateTicketTypes();
}