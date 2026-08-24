/*
 * Diagnostic (read-only): check whether the tables backing the newest features
 * exist in the connected database, and report the Prisma migration state.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REQUIRED_TABLES = [
  'Notification',
  'ChatConversation',
  'ChatMessage',
  'RecommendedVideo',
  'LessonVideoSend',
  'InstructorRating',
  'InstructorSubstitution',
  'InstructorBlackout',
  'InstructorSectorSchedule',
  'PracticalExamSlot',
  'Note',
];

async function main() {
  const dbRows = await prisma.$queryRawUnsafe('SELECT DATABASE() AS db');
  console.log('connected database:', dbRows?.[0]?.db);

  const tables = await prisma.$queryRawUnsafe(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
  );
  const present = new Set(tables.map((t) => t.name));
  console.log('total tables in schema:', present.size);

  console.log('\n=== required feature tables ===');
  for (const table of REQUIRED_TABLES) {
    console.log(present.has(table) ? `  OK      ${table}` : `  MISSING ${table}`);
  }

  console.log('\n=== Role enum in the live DB ===');
  try {
    const roleCol = await prisma.$queryRawUnsafe(
      "SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'role'",
    );
    console.log(roleCol?.[0]?.type ?? '(role column not found)');
  } catch (e) {
    console.log('could not read Role enum:', e.message);
  }

  console.log('\n=== _prisma_migrations state ===');
  if (!present.has('_prisma_migrations')) {
    console.log('  no _prisma_migrations table -> this DB was created with `prisma db push`');
  } else {
    const migrations = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10',
    );
    console.log('  last 10 applied migrations:');
    for (const m of migrations) {
      console.log(
        `   ${m.migration_name} finished=${m.finished_at ? 'yes' : 'NO'} rolledBack=${m.rolled_back_at ? 'yes' : 'no'}`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error('DIAG FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
