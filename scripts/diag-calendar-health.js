/*
 * Diagnostic (read-only): calendar correctness audit.
 *
 * The admin grid only renders columns for BAZA / EXAMEN / SUPERIOR instructors
 * (plus the "laterala" instructor id=1). A reservation is placed into a cell by
 * matching its column instructor id. So a reservation whose instructorId points
 * at anything else has no column to land in and silently disappears.
 *
 * This script reports, for the current and neighbouring months:
 *   1. reservations still being reassigned after creation (CREATE history vs now)
 *   2. reservations that CANNOT be rendered (instructor missing / inactive /
 *      SCHIMB / not a grid type)
 *   3. reservations sitting on a day where their instructor is substituted
 *      (column header shows the substitute, the row stores the base)
 *   4. two or more active reservations in the same instructor+time cell
 *   5. instructor id duplicates and order problems that affect columns
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GRID_TYPES = new Set(['BAZA', 'EXAMEN', 'SUPERIOR']);
const LATERAL_ID = 1;

function ymd(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function hm(date) {
  return new Date(date).toISOString().slice(11, 16);
}

function nameOf(inst) {
  if (!inst) return '(inexistent)';
  return `${inst.lastName ?? ''} ${inst.firstName ?? ''}`.trim() || `#${inst.id}`;
}

async function main() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59));
  console.log(`window: ${ymd(from)} .. ${ymd(to)}\n`);

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
  });
  const instById = new Map(instructors.map((i) => [i.id, i]));

  const reservations = await prisma.reservation.findMany({
    where: { deletedAt: null, startTime: { gte: from, lte: to } },
    select: {
      id: true,
      instructorId: true,
      userId: true,
      startTime: true,
      sector: true,
      isCancelled: true,
    },
    orderBy: { startTime: 'asc' },
  });
  console.log(`reservations in window: ${reservations.length}`);

  // ---- 1. still-reassigned reservations -----------------------------------
  const creates = await prisma.reservationHistory.findMany({
    where: { action: 'CREATE', createdAt: { gte: from } },
    select: { reservationId: true, instructorId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const resById = new Map(reservations.map((r) => [r.id, r]));
  const reassigned = [];
  for (const h of creates) {
    const cur = resById.get(h.reservationId);
    if (!cur || h.instructorId == null) continue;
    if (Number(h.instructorId) !== Number(cur.instructorId)) {
      reassigned.push({
        reservationId: h.reservationId,
        createdOn: `#${h.instructorId} ${nameOf(instById.get(Number(h.instructorId)))}`,
        nowOn: `#${cur.instructorId} ${nameOf(instById.get(Number(cur.instructorId)))}`,
        when: h.createdAt.toISOString(),
        lesson: `${ymd(cur.startTime)} ${hm(cur.startTime)}`,
      });
    }
  }
  console.log(`\n=== 1. reservations whose instructor changed after CREATE: ${reassigned.length} ===`);
  for (const r of reassigned.slice(0, 25)) console.log(' ', r);
  const perDay = new Map();
  for (const r of reassigned) {
    const key = r.when.slice(0, 10);
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }
  if (perDay.size) {
    console.log(' per day:');
    for (const [d, c] of [...perDay.entries()].sort()) console.log('   ', d, c);
  }

  // ---- 2. reservations that cannot be rendered ----------------------------
  const invisible = { missing: [], inactive: [], schimb: [], otherType: [] };
  for (const r of reservations) {
    if (r.instructorId === LATERAL_ID) continue;
    const inst = instById.get(r.instructorId);
    if (!inst) {
      invisible.missing.push(r);
      continue;
    }
    if (inst.instructorType === 'SCHIMB') {
      invisible.schimb.push(r);
      continue;
    }
    if (!GRID_TYPES.has(inst.instructorType)) {
      invisible.otherType.push(r);
      continue;
    }
    if (!inst.isActive) invisible.inactive.push(r);
  }
  console.log('\n=== 2. reservations with no column in the grid (invisible) ===');
  const report = (label, list) => {
    console.log(` ${label}: ${list.length}`);
    for (const r of list.slice(0, 15)) {
      const inst = instById.get(r.instructorId);
      console.log(
        `   res#${r.id} ${ymd(r.startTime)} ${hm(r.startTime)} instr#${r.instructorId} ${nameOf(inst)}` +
          ` type=${inst?.instructorType ?? '-'} active=${inst?.isActive ?? '-'} order=${inst?.order ?? '-'}`,
      );
    }
  };
  report('instructor missing from Instructor table', invisible.missing);
  report('instructor is SCHIMB (no column of its own)', invisible.schimb);
  report('instructor type not rendered in grid', invisible.otherType);
  report('instructor is inactive', invisible.inactive);

  // instructors with no usable order also lose their intended position
  const noOrder = instructors.filter(
    (i) =>
      i.isActive &&
      i.id !== LATERAL_ID &&
      GRID_TYPES.has(i.instructorType) &&
      !/^\d+$/.test(String(i.order ?? '').trim()),
  );
  console.log(`\n grid instructors without a numeric order: ${noOrder.length}`);
  for (const i of noOrder) {
    console.log(`   #${i.id} ${nameOf(i)} order=${JSON.stringify(i.order)} type=${i.instructorType}`);
  }

  // ---- 3. reservations on a substituted day ------------------------------
  const substitutions = await prisma.instructorSubstitution.findMany({
    where: { date: { gte: from, lte: to }, isActive: true },
    select: { id: true, baseInstructorId: true, substituteInstructorId: true, date: true },
  });
  const subByKey = new Map();
  for (const s of substitutions) {
    subByKey.set(`${ymd(s.date)}|${s.baseInstructorId}`, s);
  }
  const onSubstitutedDay = reservations.filter((r) =>
    subByKey.has(`${ymd(r.startTime)}|${r.instructorId}`),
  );
  console.log(
    `\n=== 3. active substitutions: ${substitutions.length}; reservations stored on a substituted base instructor: ${onSubstitutedDay.length} ===`,
  );
  console.log(
    ' (for these the column header shows the SUBSTITUTE name while the row stores the BASE instructor)',
  );
  for (const r of onSubstitutedDay.slice(0, 15)) {
    const s = subByKey.get(`${ymd(r.startTime)}|${r.instructorId}`);
    console.log(
      `   res#${r.id} ${ymd(r.startTime)} ${hm(r.startTime)} stored on #${r.instructorId} ${nameOf(
        instById.get(r.instructorId),
      )} -> header shows #${s.substituteInstructorId} ${nameOf(instById.get(s.substituteInstructorId))}`,
    );
  }

  // ---- 4. overlapping cells ---------------------------------------------
  const cell = new Map();
  for (const r of reservations) {
    if (r.isCancelled) continue;
    const key = `${r.instructorId}|${new Date(r.startTime).toISOString()}`;
    if (!cell.has(key)) cell.set(key, []);
    cell.get(key).push(r);
  }
  const collisions = [...cell.entries()].filter(([, list]) => list.length > 1);
  console.log(`\n=== 4. cells holding more than one active reservation: ${collisions.length} ===`);
  for (const [key, list] of collisions.slice(0, 25)) {
    const [instructorId, iso] = key.split('|');
    console.log(
      `   instr#${instructorId} ${nameOf(instById.get(Number(instructorId)))} ${ymd(iso)} ${hm(iso)}` +
        ` -> res ${list.map((r) => `#${r.id}(user ${r.userId})`).join(', ')}`,
    );
  }

  // ---- 5. duplicate instructor ids / order collisions among columns -----
  const gridInstructors = instructors.filter(
    (i) => i.isActive && i.id !== LATERAL_ID && GRID_TYPES.has(i.instructorType),
  );
  const byOrder = new Map();
  for (const i of gridInstructors) {
    const key = String(i.order ?? '').trim() || '<null>';
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key).push(i);
  }
  const orderCollisions = [...byOrder.entries()].filter(([, l]) => l.length > 1);
  console.log(`\n=== 5. order collisions among grid columns: ${orderCollisions.length} ===`);
  for (const [key, list] of orderCollisions) {
    console.log(`   order=${key}: ${list.map((i) => `#${i.id} ${nameOf(i)}`).join(' | ')}`);
  }
  console.log(`   grid columns total: ${gridInstructors.length}`);
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
