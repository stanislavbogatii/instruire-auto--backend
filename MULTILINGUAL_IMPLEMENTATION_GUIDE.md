# Multilingual Support - Implementation Guide

## Overview

All questions and answers in the database now support both Romanian (ro) and Russian (ru) languages. The data is stored as JSON in the existing `text` and `answers` fields, so **no database schema changes were required**.

## Database Structure

### Before (Romanian only)
```typescript
Question {
  text: "Prin termenul „depăşire" se înţelege:",
  answers: '["Answer 1 in Romanian", "Answer 2 in Romanian", "Answer 3 in Romanian"]',
  correctAnswer: 1
}
```

### After (Multilingual)
```typescript
Question {
  text: '{"ro": "Prin termenul „depăşire" se înţelege:", "ru": "Под термином «обгон» понимается:"}',
  answers: '[{"ro": "Answer 1 RO", "ru": "Answer 1 RU"}, {"ro": "Answer 2 RO", "ru": "Answer 2 RU"}, ...]',
  correctAnswer: 1
}
```

## Migration Summary

✅ **Successfully completed:**
- 1,008 EXAM questions updated (42 tickets)
- 987 PRACTICE questions updated (24 tickets)
- **Total: 1,995 questions** now have both Romanian and Russian translations
- Zero data loss - all Romanian data preserved
- No schema changes required

## How to Use in Your API

### 1. Backend - Reading Questions

When fetching questions from the database, parse the JSON fields:

```typescript
// Example: Get questions for an exam/practice
const questions = await prisma.question.findMany({
  where: { /* your filters */ }
});

// Transform for API response
const transformedQuestions = questions.map(q => {
  const questionText = JSON.parse(q.text);
  const answers = JSON.parse(q.answers);
  
  return {
    id: q.id,
    text: questionText, // { ro: "...", ru: "..." }
    answers: answers,   // [{ ro: "...", ru: "..." }, ...]
    correctAnswer: q.correctAnswer,
    image: q.image
  };
});
```

### 2. Backend - API Endpoint Example

Add language support to your endpoints:

```typescript
// Example: GET /api/questions?lang=ru
app.get('/api/questions', async (req, res) => {
  const language = req.query.lang || 'ro'; // Default to Romanian
  
  const questions = await prisma.question.findMany();
  
  const response = questions.map(q => {
    const questionText = JSON.parse(q.text);
    const answers = JSON.parse(q.answers);
    
    return {
      id: q.id,
      text: questionText[language],
      answers: answers.map(a => a[language]),
      correctAnswer: q.correctAnswer,
      image: q.image
    };
  });
  
  res.json(response);
});
```

### 3. Frontend - Using the Data

#### Option A: Client-side language selection
```typescript
// Get full multilingual data from API
const question = await fetch('/api/questions/1').then(r => r.json());

// Let user select language
const selectedLang = 'ru'; // or 'ro'

// Display in selected language
const displayText = question.text[selectedLang];
const displayAnswers = question.answers.map(a => a[selectedLang]);
```

#### Option B: Server-side language filtering
```typescript
// Request specific language from API
const questions = await fetch('/api/questions?lang=ru').then(r => r.json());

// Data is already in the selected language
questions.forEach(q => {
  console.log(q.text); // Already in Russian
  console.log(q.answers); // Already in Russian
});
```

## Example API Responses

### Full Multilingual Response
```json
{
  "id": 1,
  "text": {
    "ro": "Prin termenul „depăşire" se înţelege:",
    "ru": "Под термином «обгон» понимается:"
  },
  "answers": [
    {
      "ro": "Devansarea unui vehicul...",
      "ru": "Опережение транспортного средства..."
    },
    {
      "ro": "Devansarea unuia sau câtorva vehicule...",
      "ru": "Опережение одного или нескольких..."
    }
  ],
  "correctAnswer": 1,
  "image": "B1/B1_Q1.png"
}
```

### Language-Filtered Response (lang=ru)
```json
{
  "id": 1,
  "text": "Под термином «обгон» понимается:",
  "answers": [
    "Опережение транспортного средства...",
    "Опережение одного или нескольких..."
  ],
  "correctAnswer": 1,
  "image": "B1/B1_Q1.png"
}
```

## Updating Your Existing Code

### 1. Exam Module (src/exams/)

Update your services to parse JSON fields:

```typescript
// Before
const questionText = question.text;

// After
const questionText = JSON.parse(question.text);
// Access: questionText.ro or questionText.ru
```

### 2. Practice Module (src/practice/)

Same approach - parse the JSON strings:

```typescript
// Before
const answers = JSON.parse(question.answers);

// After
const answers = JSON.parse(question.answers); // Now returns [{ ro, ru }, ...]
```

### 3. Add Language DTOs

Create a DTO for language selection:

```typescript
// src/common/dto/language.dto.ts
export enum Language {
  RO = 'ro',
  RU = 'ru'
}

export class LanguageQueryDto {
  @IsOptional()
  @IsEnum(Language)
  lang?: Language = Language.RO;
}
```

### 4. Update Question Response DTOs

```typescript
// Option 1: Return multilingual
export class QuestionResponseDto {
  id: number;
  text: { ro: string; ru: string };
  answers: Array<{ ro: string; ru: string }>;
  correctAnswer: number;
  image?: string;
}

// Option 2: Return single language
export class QuestionResponseDto {
  id: number;
  text: string;
  answers: string[];
  correctAnswer: number;
  image?: string;
}
```

## Utility Functions

Create helper functions for common operations:

```typescript
// src/common/utils/multilingual.util.ts
export function parseQuestion(question: Question, lang?: 'ro' | 'ru') {
  const text = JSON.parse(question.text);
  const answers = JSON.parse(question.answers);
  
  if (lang) {
    return {
      ...question,
      text: text[lang],
      answers: answers.map(a => a[lang])
    };
  }
  
  return {
    ...question,
    text,
    answers
  };
}

export function formatQuestionResponse(questions: Question[], lang: 'ro' | 'ru') {
  return questions.map(q => parseQuestion(q, lang));
}
```

## Testing

Test with both languages:

```bash
# Get Romanian questions (default)
curl http://localhost:3000/api/questions

# Get Russian questions
curl http://localhost:3000/api/questions?lang=ru

# Get practice questions in Russian
curl http://localhost:3000/api/practice/tickets/1/questions?lang=ru

# Get exam questions in Romanian
curl http://localhost:3000/api/exams/tickets/1/questions?lang=ro
```

## Important Notes

1. **No Schema Changes**: The database schema remains unchanged. Only the data format inside the JSON fields changed.

2. **Backward Compatible**: If you need to support old code temporarily, you can add a check:
   ```typescript
   const text = question.text;
   let questionText;
   try {
     questionText = JSON.parse(text);
     if (questionText.ro) {
       // New multilingual format
       displayText = questionText[selectedLang];
     }
   } catch {
     // Old format (plain string)
     displayText = text;
   }
   ```

3. **Performance**: Parsing JSON is fast. If needed, you can cache parsed results.

4. **Validation**: Always validate that both `ro` and `ru` exist when creating/updating questions.

## Next Steps

1. ✅ Database updated with Russian translations
2. 🔄 Update API controllers to support `?lang=ro|ru` parameter
3. 🔄 Update DTOs and response types
4. 🔄 Update frontend to allow language selection
5. 🔄 Test both PRACTICE and EXAM modules with both languages
6. 🔄 Add language preference to user settings (optional)

## Scripts Available

- `add-russian-translations.ts` - Adds Russian translations to all questions
- `verify-russian-translations.ts` - Verifies all questions have both languages

Run verification anytime:
```bash
npx ts-node verify-russian-translations.ts
```

## Questions?

The data structure is simple:
- Questions: `{ ro: "text", ru: "text" }`
- Answers: `[{ ro: "answer", ru: "answer" }, ...]`

Parse the JSON, select the language, display the text. That's it! 🎉
