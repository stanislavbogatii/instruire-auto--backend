/**
 * Sectors supported by the driving-school platform. Kept as a plain string
 * union (not a Prisma enum) because `Instructor.sector` / `Reservation.sector`
 * / `InstructorsGroup.sector` are free-form strings in the database.
 */
export const SECTORS = ['Botanica', 'Ciocana', 'Buiucani'] as const;
export type Sector = (typeof SECTORS)[number];

/**
 * Sector where the mandatory "poligon" lessons always take place.
 */
export const POLIGON_SECTOR: Sector = 'Botanica';

/**
 * Sectors that require the student's first lessons to happen in
 * `POLIGON_SECTOR` before moving on to their chosen sector.
 */
export const POLIGON_REQUIRED_SECTORS: Sector[] = ['Ciocana', 'Buiucani'];

/**
 * Number of mandatory poligon lessons before a student moves to their
 * chosen sector (Ciocana / Buiucani).
 */
export const MANDATORY_POLIGON_LESSONS = 7;

/** Case/whitespace-insensitive comparison helper for sector strings. */
export function normalizeSector(sector: string | null | undefined): string {
  return (sector || '').trim().toLowerCase();
}

/** Whether `sector` requires the mandatory poligon lessons in Botanica first. */
export function isPoligonRequiredSector(
  sector: string | null | undefined,
): boolean {
  const normalized = normalizeSector(sector);
  return POLIGON_REQUIRED_SECTORS.some((s) => s.toLowerCase() === normalized);
}

/** Whether `sector` is the poligon sector (Botanica) itself. */
export function isPoligonSector(sector: string | null | undefined): boolean {
  return normalizeSector(sector) === POLIGON_SECTOR.toLowerCase();
}
