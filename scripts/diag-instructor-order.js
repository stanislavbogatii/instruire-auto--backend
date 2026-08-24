/*
 * Diagnostic (read-only): inspect Instructor.order (a nullable String column)
 * for duplicates, gaps and non-numeric values, which drive calendar column
 * placement on the client, plus a look at recent substitutions.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const instructors = await prisma.instructor.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sector: true,
      isActive: true,
      order: true,
      instructorType: true,
      isExamen: true,
    },
    orderBy: { id: 'asc' },
  });

  const active = instructors.filter((i) => i.isActive);
  console.log('instructors total:', instructors.length, '| active:', active.length);

  const byOrder = new Map();
  for (const i of active) {
    const key = i.order == null || i.order === '' ? '<null>' : String(i.order);
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key).push(i);
  }

  console.log('\n=== DUPLICATE / EMPTY order values among ACTIVE instructors ===');
  let dupGroups = 0;
  for (const [key, list] of [...byOrder.entries()].sort(
    (a, b) => (Number(a[0]) || 999) - (Number(b[0]) || 999),
  )) {
    if (list.length > 1 || key === '<null>') {
      dupGroups += 1;
      console.log(
        `order=${key} -> ${list.length} instructors:`,
        list
          .map((i) => `#${i.id} ${i.lastName} ${i.firstName} [${i.sector}] ${i.instructorType}`)
          .join(' | '),
      );
    }
  }
  if (!dupGroups) console.log('none');

  const nonNumeric = active.filter(
    (i) => i.order != null && i.order !== '' && !/^\d+$/.test(String(i.order).trim()),
  );
  console.log('\n=== NON-NUMERIC order values ===');
  console.log(nonNumeric.length ? nonNumeric : 'none');

  const numeric = active
    .map((i) => Number(i.order))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  console.log('\norder range:', numeric[0], '->', numeric[numeric.length - 1]);
  console.log('distinct order values:', new Set(numeric).size, 'for', active.length, 'active instructors');

  console.log('\n=== instructorType breakdown (active) ===');
  const typeCounts = {};
  for (const i of active) {
    typeCounts[i.instructorType] = (typeCounts[i.instructorType] || 0) + 1;
  }
  console.log(typeCounts);

  const subs = await prisma.instructorSubstitution.findMany({
    orderBy: { id: 'desc' },
    take: 25,
  });
  console.log('\n=== last 25 InstructorSubstitution rows ===');
  for (const s of subs) console.log(s);
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
