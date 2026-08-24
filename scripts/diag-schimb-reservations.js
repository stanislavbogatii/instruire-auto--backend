/*
 * Diagnostic (read-only): why do reservations sit on SCHIMB instructors?
 *
 * The grid renders columns only for BAZA / EXAMEN / SUPERIOR. Any reservation
 * whose instructorId points at a SCHIMB instructor has no column and is not
 * drawn. This script measures the scale and shape of the problem: which
 * instructors, how many lessons, over what period, whether those lessons are
 * still in the future, and whether the same instructors are also used as
 * substitutes.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function ymd(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function nameOf(i) {
  if (!i) return '(inexistent)';
  return `${i.lastName ?? ''} ${i.firstName ?? ''}`.trim() || `#${i.id}`;
}

async function main() {
  const instructors = await prisma.instructor.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sector: true,
      order: true,
      isActive: true,
      instructorType: true,
    },
    orderBy: { id: 'asc' },
  });
  const instById = new Map(instructors.map((i) => [i.id, i]));
  const schimb = instructors.filter((i) => i.instructorType === 'SCHIMB');

  console.log(`instructors total: ${instructors.length}`);
  console.log(`of type SCHIMB: ${schimb.length}\n`);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log('=== reservations per SCHIMB instructor (all time, not deleted) ===');
  const rows = [];
  for (const inst of schimb) {
    const total = await prisma.reservation.count({
      where: { instructorId: inst.id, deletedAt: null },
    });
    if (!total) {
      rows.push({ inst, total: 0, future: 0, first: null, last: null, asSubstitute: 0 });
      continue;
    }
    const future = await prisma.reservation.count({
      where: { instructorId: inst.id, deletedAt: null, startTime: { gte: today } },
    });
    const first = await prisma.reservation.findFirst({
      where: { instructorId: inst.id, deletedAt: null },
      orderBy: { startTime: 'asc' },
      select: { startTime: true },
    });
    const last = await prisma.reservation.findFirst({
      where: { instructorId: inst.id, deletedAt: null },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    });
    const asSubstitute = await prisma.instructorSubstitution.count({
      where: { substituteInstructorId: inst.id, isActive: true },
    });
    rows.push({ inst, total, future, first: first?.startTime, last: last?.startTime, asSubstitute });
  }

  rows.sort((a, b) => b.total - a.total);
  for (const r of rows) {
    console.log(
      `  #${String(r.inst.id).padStart(2)} ${nameOf(r.inst).padEnd(24)} order=${String(
        r.inst.order ?? '-',
      ).padStart(3)} sector=${String(r.inst.sector ?? '-').padEnd(10)}` +
        ` lessons=${String(r.total).padStart(5)} viitoare=${String(r.future).padStart(4)}` +
        ` ${r.first ? ymd(r.first) : '-'} .. ${r.last ? ymd(r.last) : '-'}` +
        ` usedAsSubstitute=${r.asSubstitute}`,
    );
  }

  const withLessons = rows.filter((r) => r.total > 0);
  const withFuture = rows.filter((r) => r.future > 0);
  console.log(
    `\nSCHIMB instructors that own lessons: ${withLessons.length} / ${schimb.length}` +
      `; with lessons in the future: ${withFuture.length}`,
  );
  console.log(
    `total lessons hidden from the grid: ${withLessons.reduce((s, r) => s + r.total, 0)}` +
      ` (in the future: ${withLessons.reduce((s, r) => s + r.future, 0)})`,
  );

  // Do these SCHIMB instructors collide on `order` with real grid columns?
  console.log('\n=== order collisions between SCHIMB and grid instructors ===');
  const gridTypes = new Set(['BAZA', 'EXAMEN', 'SUPERIOR']);
  const gridByOrder = new Map();
  for (const i of instructors) {
    if (!i.isActive || !gridTypes.has(i.instructorType)) continue;
    const key = String(i.order ?? '').trim();
    if (!key) continue;
    if (!gridByOrder.has(key)) gridByOrder.set(key, []);
    gridByOrder.get(key).push(i);
  }
  for (const s of schimb) {
    const key = String(s.order ?? '').trim();
    const clash = key ? gridByOrder.get(key) : null;
    if (clash?.length) {
      console.log(
        `  SCHIMB #${s.id} ${nameOf(s)} order=${key} <-> column ${clash
          .map((c) => `#${c.id} ${nameOf(c)}`)
          .join(', ')}`,
      );
    }
  }

  // When was the last lesson created for a SCHIMB instructor? Tells us whether
  // new bookings still land there (an ongoing bug) or only historical ones do.
  console.log('\n=== most recent CREATE history landing on a SCHIMB instructor ===');
  const schimbIds = schimb.map((i) => i.id);
  const recentCreates = await prisma.reservationHistory.findMany({
    where: { action: 'CREATE', instructorId: { in: schimbIds } },
    select: { reservationId: true, instructorId: true, createdAt: true, startTime: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  if (!recentCreates.length) console.log('  none');
  for (const h of recentCreates) {
    console.log(
      `  res#${h.reservationId} created ${h.createdAt.toISOString().slice(0, 16)}` +
        ` for instr#${h.instructorId} ${nameOf(instById.get(h.instructorId))}` +
        ` lesson ${h.startTime ? ymd(h.startTime) : '-'}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
