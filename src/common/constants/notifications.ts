/**
 * Completed-lesson count at which booking reminders (2.5-2.7) start.
 */
export const LESSON_REMINDER_START_AT = 12;

/**
 * Number of future booked lessons a student needs before reminders stop.
 */
export const LESSON_REMINDER_TARGET_BOOKED = 15;

/**
 * Max reminders sent per cron run. Throttles the first-deploy backlog
 * (students who already qualify) across several days instead of notifying
 * everyone at once; the existing "unread reminder already exists" skip
 * naturally advances through the backlog on each subsequent run.
 */
export const LESSON_REMINDER_MAX_PER_RUN = 40;
