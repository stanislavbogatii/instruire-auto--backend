/*
 * Diagnostic (read-only): lessons per instructor, grouped by instructorType.
 *
 * Purpose: decide whether the lessons sitting on SCHIMB instructors look like
 * a real operational situation or like generated/seed data. If every instructor
 * (BAZA and SCHIMB alike) owns a similar, suspiciously uniform number of
 * lessons over the same date range, the data is seeded and cannot be used to
 * reason about production.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function ymd(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '-';
}

function nameOf(i) {
  return `${i.lastName ?? ''} ${i.firstName ?? ''}`.trim() || `#${i.id}`;
}

async function main() {
  const instructors = await prisma.instructor.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      instructorType: true,
      isActive: true,
      order: true,
    },
    orderBy: { id: 'asc' },
  });

  const grouped = await prisma.reservation.groupBy({
    by: ['instructorId'],
    where: { deletedAt: null },
    _count: { _all: true },
    _min: { startTime: true },
    _max: { startTime: true },
  });
  const statsById = new Map(
    grouped.map((g) => [
      g.instructorId,
      { count: g._count._all, min: g._min.startTime, max: g._max.startTime },
    ]),
  );

  const byType = new Map();
  console.log('id  type      active order  lessons  first        last         name');
  for (const inst of instructors) {
    const s = statsById.get(inst.id) || { count: 0, min: null, max: null };
    console.log(
      `${String(inst.id).padStart(3)} ${String(inst.instructorType).padEnd(9)} ` +
        `${String(inst.isActive).padEnd(6)} ${String(inst.order ?? '-').padStart(5)} ` +
        `${String(s.count).padStart(7)}  ${ymd(s.min).padEnd(12)} ${ymd(s.max).padEnd(12)} ${nameOf(inst)}`,
    );
    if (!byType.has(inst.instructorType)) byType.set(inst.instructorType, []);
    byType.get(inst.instructorType).push(s.count);
  }

  console.log('\n=== per instructorType ===');
  for (const [type, counts] of byType.entries()) {
    const total = counts.reduce((a, b) => a + b, 0);
    const withLessons = counts.filter((c) => c > 0);
    const avg = withLessons.length ? Math.round(total / withLessons.length) : 0;
    console.log(
      `${String(type).padEnd(9)} instructors=${String(counts.length).padStart(3)}` +
        ` withLessons=${String(withLessons.length).padStart(3)}` +
        ` totalLessons=${String(total).padStart(6)} avgPerActive=${String(avg).padStart(5)}` +
        ` min=${withLessons.length ? Math.min(...withLessons) : 0} max=${withLessons.length ? Math.max(...withLessons) : 0}`,
    );
  }

  // Seed data usually lands on round timestamps and in one big burst.
  console.log('\n=== reservations grouped by creation day (top 15) ===');
  const creates = await prisma.reservationHistory.groupBy({
    by: ['action'],
    _count: { _all: true },
  });
  console.log('history actions:', creates.map((c) => `${c.action}=${c._count._all}`).join(', '));

  const all = await prisma.reservation.findMany({
    where: { deletedAt: null },
    select: { createdAt: true },
  });
  const perDay = new Map();
  for (const r of all) {
    const key = ymd(r.createdAt);
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }
  const sorted = [...perDay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [day, count] of sorted) console.log(`  ${day}  ${count}`);
  console.log(`  distinct creation days: ${perDay.size}, total reservations: ${all.length}`);
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
