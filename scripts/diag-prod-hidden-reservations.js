/* READ-ONLY diagnostic — safe on production */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const GRID = new Set(['BAZA', 'EXAMEN', 'SUPERIOR']);
const name = (i) => `${i?.lastName || ''} ${i?.firstName || ''}`.trim() || `#${i?.id}`;

(async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const instructors = await prisma.instructor.findMany({
    select: { id: true, firstName: true, lastName: true, instructorType: true, isActive: true, order: true },
    orderBy: { id: 'asc' },
  });

  console.log('=== Instructori pe tip ===');
  const types = {};
  for (const i of instructors) types[i.instructorType] = (types[i.instructorType] || 0) + 1;
  Object.entries(types).sort().forEach(([t, n]) => console.log(`  ${t}: ${n}`));

  const hidden = instructors.filter((i) => i.id !== 1 && (!GRID.has(i.instructorType) || !i.isActive));
  console.log('\n=== Fara coloana in calendar ===');
  if (!hidden.length) console.log('  niciunul');

  let total = 0;
  let future = 0;
  for (const inst of hidden) {
    const all = await prisma.reservation.count({ where: { instructorId: inst.id, deletedAt: null } });
    const fut = await prisma.reservation.count({
      where: { instructorId: inst.id, deletedAt: null, startTime: { gte: today } },
    });
    total += all;
    future += fut;
    console.log(`  #${inst.id} ${name(inst)} tip=${inst.instructorType} lecții=${all} viitoare=${fut}`);
  }

  console.log('\n=== CONCLUZIE ===');
  console.log(`  lecții invizibile: ${total}`);
  console.log(`  din care viitoare: ${future}`);

  if (future > 0) {
    console.log('\n  Primele lecții viitoare invizibile:');
    const rows = await prisma.reservation.findMany({
      where: { deletedAt: null, startTime: { gte: today }, instructorId: { in: hidden.map((i) => i.id) } },
      select: { id: true, instructorId: true, userId: true, startTime: true },
      orderBy: { startTime: 'asc' },
      take: 20,
    });
    const byId = new Map(instructors.map((i) => [i.id, i]));
    for (const r of rows) {
      const d = new Date(r.startTime).toISOString();
      console.log(`    res#${r.id} ${d.slice(0, 10)} ${d.slice(11, 16)} elev=${r.userId} instr=#${r.instructorId} ${name(byId.get(r.instructorId))}`);
    }
  }
})()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
