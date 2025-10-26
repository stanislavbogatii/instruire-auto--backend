/**
 * Simple helper to parse multilingual question data
 */

export type Language = 'ro' | 'ru';

/**
 * Parse question text from JSON
 */
export function parseQuestionText(text: string, lang: Language = 'ro'): string {
  try {
    const parsed = JSON.parse(text);
    return parsed[lang] || parsed.ro; // Fallback to Romanian
  } catch {
    return text; // Return as-is if not JSON (backward compatibility)
  }
}

/**
 * Parse answers from JSON
 */
export function parseAnswers(answers: string, lang: Language = 'ro'): string[] {
  try {
    const parsed = JSON.parse(answers);
    
    // Check if it's the new multilingual format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].ro) {
      return parsed.map(a => a[lang] || a.ro); // Fallback to Romanian
    }
    
    // Old format (array of strings)
    return parsed;
  } catch {
    return []; // Return empty array on error
  }
}
