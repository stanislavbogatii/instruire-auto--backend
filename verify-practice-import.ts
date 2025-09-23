import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  try {
    console.log('🔍 Verifying practice data import...\n');
    
    // Use raw SQL queries to bypass TypeScript compilation issues
    const examTicketsResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Ticket WHERE type = 'EXAM'`;
    const practiceTicketsResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Ticket WHERE type = 'PRACTICE'`;
    const totalQuestionsResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Question`;
    
    // Get sample practice tickets
    const sampleTickets = await prisma.$queryRaw`
      SELECT t.id, t.name, t.type, COUNT(tq.questionId) as questionCount
      FROM Ticket t
      LEFT JOIN TicketQuestion tq ON t.id = tq.ticketId
      WHERE t.type = 'PRACTICE'
      GROUP BY t.id, t.name, t.type
      ORDER BY t.name
      LIMIT 5
    `;
    
    console.log('📊 Database Summary:');
    console.log(`   • EXAM tickets: ${(examTicketsResult as any)[0].count}`);
    console.log(`   • PRACTICE tickets: ${(practiceTicketsResult as any)[0].count}`);
    console.log(`   • Total questions: ${(totalQuestionsResult as any)[0].count}`);
    
    console.log('\n📋 Sample Practice Tickets:');
    (sampleTickets as any[]).forEach(ticket => {
      console.log(`   • ${ticket.name}: ${ticket.questionCount} questions (Type: ${ticket.type})`);
    });
    
    // Test that we can retrieve a practice question
    const sampleQuestion = await prisma.$queryRaw`
      SELECT q.text, q.answers, q.correctAnswer
      FROM Question q
      JOIN TicketQuestion tq ON q.id = tq.questionId
      JOIN Ticket t ON tq.ticketId = t.id
      WHERE t.type = 'PRACTICE'
      LIMIT 1
    `;
    
    if ((sampleQuestion as any[]).length > 0) {
      const q = (sampleQuestion as any[])[0];
      const answers = JSON.parse(q.answers);
      console.log('\n📝 Sample Practice Question:');
      console.log(`   Text: ${q.text.substring(0, 80)}...`);
      console.log(`   Answers: ${answers.length} options`);
      console.log(`   Correct Answer: ${q.correctAnswer}`);
    }
    
    console.log('\n🚀 API Testing:');
    console.log('You can now test these endpoints:');
    console.log('   GET /api/exams/tickets?type=PRACTICE - for practice tickets');
    console.log('   GET /api/exams/tickets?type=EXAM - for exam tickets');
    console.log('   GET /api/exams/tickets - defaults to EXAM tickets');
    
    console.log('\n✅ Import verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error verifying import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport();
