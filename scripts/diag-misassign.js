/*
 * Diagnostic (read-only): find reservations whose CREATE history recorded a
 * different instructorId than the row currently has, i.e. the client had to
 * "heal" a server-side instructor reassignment.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const creates = await prisma.reservationHistory.findMany({
    where: { action: 'CREATE', createdAt: { gte: since } },
    select: {
      reservationId: true,
      instructorId: true,
      sector: true,
      userId: true,
      startTime: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  });

  console.log('CREATE history rows in last 60 days:', creates.length);

  const ids = [...new Set(creates.map((r) => r.reservationId).filter(Boolean))];
  const rows = await prisma.reservation.findMany({
    where: { id: { in: ids } },
    select: { id: true, instructorId: true, sector: true, userId: true, startTime: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const mismatches = [];
  for (const h of creates) {
    const current = byId.get(h.reservationId);
    if (!current || h.instructorId == null) continue;
    if (Number(h.instructorId) !== Number(current.instructorId)) {
      mismatches.push({
        reservationId: h.reservationId,
        createdWithInstructor: Number(h.instructorId),
        nowInstructor: Number(current.instructorId),
        createdSector: h.sector,
        nowSector: current.sector,
        userId: current.userId,
        startTime: current.startTime,
        historyAt: h.createdAt,
      });
    }
  }

  console.log('\nReservations whose instructor differs from CREATE snapshot:', mismatches.length);
  for (const m of mismatches.slice(0, 30)) console.log(m);

  // How many CREATE rows landed on a Botanica (poligon) instructor while the
  // history sector says a poligon-required sector was requested.
  const botanica = await prisma.instructor.findMany({
    where: { sector: 'Botanica' },
    select: { id: true, isActive: true, order: true, userId: true },
    orderBy: { id: 'asc' },
  });
  console.log('\nBotanica (poligon) instructors, id asc — Prisma findFirst picks the first:');
  for (const i of botanica) console.log(i);

  const botanicaIds = new Set(botanica.map((i) => i.id));
  const suspicious = creates.filter(
    (h) =>
      botanicaIds.has(Number(h.instructorId)) &&
      String(h.sector || '').trim().toLowerCase() === 'botanica',
  );
  console.log(
    '\nCREATE rows written onto a Botanica instructor with sector forced to "Botanica":',
    suspicious.length,
  );
  const byDay = new Map();
  for (const h of suspicious) {
    const key = h.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  console.log('per day (createdAt):');
  for (const [day, count] of [...byDay.entries()].sort()) {
    console.log(' ', day, count);
  }
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
