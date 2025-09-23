import { PrismaClient } from '@prisma/client';

async function testTicketTypes() {
  const prisma = new PrismaClient();
  
  try {
    // Test filtering tickets by type
    const examTickets = await prisma.ticket.findMany({
      where: {
        type: 'EXAM'
      },
      take: 3,
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    console.log('🎯 EXAM tickets:');
    examTickets.forEach(t => {
      console.log(`  - ${t.name}: ${t._count.questions} questions`);
    });
    
    const practiceTickets = await prisma.ticket.findMany({
      where: {
        type: 'PRACTICE'
      },
      take: 3
    });
    
    console.log('\n📚 PRACTICE tickets:', practiceTickets.length);
    
    // Total counts
    const totalExamTickets = await prisma.ticket.count({ where: { type: 'EXAM' } });
    const totalPracticeTickets = await prisma.ticket.count({ where: { type: 'PRACTICE' } });
    const totalQuestions = await prisma.question.count();
    
    console.log('\n📊 Summary:');
    console.log(`🎯 EXAM tickets: ${totalExamTickets}`);
    console.log(`📚 PRACTICE tickets: ${totalPracticeTickets}`);
    console.log(`❓ Total questions (shared): ${totalQuestions}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketTypes();
