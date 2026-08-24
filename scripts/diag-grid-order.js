/*
 * Diagnostic (read-only): reproduce the calendar grid column placement.
 * Only BAZA / EXAMEN / SUPERIOR instructors become grid columns (SCHIMB ones
 * are shown as an overlay on the base instructor's column), so collisions only
 * matter within that subset.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GRID_TYPES = new Set(['BAZA', 'EXAMEN', 'SUPERIOR']);
const LATERAL_ID = '1';
const MAX_ORDER_POSITION = 60;

async function main() {
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sector: true,
      order: true,
      instructorType: true,
    },
    orderBy: { id: 'asc' },
  });

  const gridList = instructors.filter(
    (i) => String(i.id) !== LATERAL_ID && GRID_TYPES.has(i.instructorType),
  );
  console.log('instructors that become grid columns:', gridList.length);

  const byOrder = new Map();
  for (const i of gridList) {
    const key = i.order == null || i.order === '' ? '<null>' : String(i.order).trim();
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key).push(i);
  }

  console.log('\n=== collisions / empty order WITHIN the grid column list ===');
  let collisions = 0;
  for (const [key, list] of byOrder.entries()) {
    if (list.length > 1 || key === '<null>' || !/^\d+$/.test(key)) {
      collisions += 1;
      console.log(
        `order=${key} -> ${list.length}:`,
        list.map((i) => `#${i.id} ${i.lastName} ${i.firstName} ${i.instructorType}`).join(' | '),
      );
    }
  }
  if (!collisions) console.log('none');

  // Replicate buildCanvasList placement to see the resulting column layout.
  const mapped = gridList
    .map((i) => ({
      id: String(i.id),
      name: `${i.lastName} ${i.firstName}`.trim(),
      order: Number.isFinite(Number(i.order)) ? Number(i.order) : null,
    }))
    .sort((a, b) => {
      const ao = a.order ?? Number.POSITIVE_INFINITY;
      const bo = b.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

  const runPlacement = (useSplice) => {
    const positioned = [];
    const noOrder = [];
    for (const inst of mapped) {
      const raw = Number(inst.order);
      const order = Number.isFinite(raw)
        ? Math.max(1, Math.min(MAX_ORDER_POSITION, Math.trunc(raw)))
        : null;
      if (!order) {
        noOrder.push(inst);
        continue;
      }
      const desiredIndex = order - 1;
      while (positioned.length < desiredIndex) positioned.push(null);
      if (positioned.length === desiredIndex) {
        positioned.push(inst);
      } else if (positioned[desiredIndex] == null) {
        positioned[desiredIndex] = inst;
      } else if (useSplice) {
        positioned.splice(desiredIndex, 0, inst);
      } else {
        let idx = desiredIndex + 1;
        while (idx < positioned.length && positioned[idx] != null) idx += 1;
        if (idx >= positioned.length) positioned.push(inst);
        else positioned[idx] = inst;
      }
    }
    return positioned;
  };

  const withSplice = runPlacement(true);
  const withoutSplice = runPlacement(false);

  console.log('\n=== column layout: current (splice) vs no-shift ===');
  const len = Math.max(withSplice.length, withoutSplice.length);
  let differences = 0;
  for (let i = 0; i < len; i++) {
    const a = withSplice[i];
    const b = withoutSplice[i];
    const same = (a?.id ?? null) === (b?.id ?? null);
    if (!same) differences += 1;
    console.log(
      `col ${String(i + 1).padStart(2)} ${same ? ' ' : '!'} splice=${label(a)}  noShift=${label(b)}`,
    );
  }
  console.log('\ncolumns that differ between the two strategies:', differences);
}

function label(inst) {
  if (!inst) return '(gol)';
  return `#${inst.id} ${inst.name} [order=${inst.order}]`;
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
