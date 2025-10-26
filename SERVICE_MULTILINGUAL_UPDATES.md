# Service Updates for Multilingual Support

## Summary

Your service methods **will NOT work normally** with the multilingual changes without updates. Here's what needed to be fixed:

## The Problem

**Before:**
```typescript
answers: JSON.parse(question.answers)
// Returns: ["Answer 1", "Answer 2", "Answer 3"]
```

**After multilingual migration:**
```typescript
answers: JSON.parse(question.answers)
// Returns: [{"ro": "Answer 1", "ru": "Answer 1 RU"}, {"ro": "Answer 2", "ru": "Answer 2 RU"}, ...]
```

Your frontend would receive objects instead of strings, breaking the display!

## The Solution

### 1. Created Utility Helper (`src/common/utils/multilingual.util.ts`)

Simple functions to parse multilingual data:
- `parseQuestionText(text, lang)` - Extracts text in selected language
- `parseAnswers(answers, lang)` - Extracts answers in selected language
- **Includes backward compatibility** - works with old format too!

### 2. Updated DTOs (`src/exams/dto/exam.dto.ts`)

Added language support:
```typescript
export enum Language {
  RO = 'ro',
  RU = 'ru',
}

export class LanguageQueryDto {
  lang?: Language = Language.RO; // Defaults to Romanian
}
```

### 3. Updated Service Methods (`src/exams/exams.service.ts`)

Updated these methods to accept `lang` parameter:
- ✅ `createExam(userId, dto, lang)` - Create exam with language
- ✅ `getExamDetails(examId, lang)` - Get exam in selected language  
- ✅ `getPracticeDetails(studentTicketId, lang)` - Get practice in selected language

**Changed from:**
```typescript
text: question.text,
answers: JSON.parse(question.answers),
```

**To:**
```typescript
text: parseQuestionText(question.text, lang),
answers: parseAnswers(question.answers, lang),
```

## What Still Works

✅ **`correctAnswer` field** - Still works! It's an index (0, 1, 2...) that points to which answer is correct
✅ **`submitPracticeAnswer()`** - Works perfectly! It only compares indices:
```typescript
const isCorrect = answerRecord.question.correctAnswer === submitAnswerDto.selectedAnswer;
```

## Next Steps for Controller

Update your controllers to accept language parameter:

```typescript
// Example: exams.controller.ts
@Get('practice/:id')
async getPracticeDetails(
  @Param('id', ParseIntPipe) id: number,
  @Query() query: LanguageQueryDto, // Add this
) {
  return this.examsService.getPracticeDetails(id, query.lang);
}

@Post('create')
async createExam(
  @User('id') userId: number,
  @Body() createExamDto: CreateExamDto,
  @Query() query: LanguageQueryDto, // Add this
) {
  return this.examsService.createExam(userId, createExamDto, query.lang);
}
```

## Usage Examples

### Frontend - Romanian (default)
```typescript
GET /api/exams/123
// Returns questions in Romanian
```

### Frontend - Russian
```typescript
GET /api/exams/123?lang=ru
// Returns questions in Russian
```

### Practice - Russian
```typescript
GET /api/practice/456?lang=ru
// Returns practice questions in Russian
```

## Files Modified

1. ✅ `src/common/utils/multilingual.util.ts` - Created
2. ✅ `src/exams/dto/exam.dto.ts` - Added Language enum and DTO
3. ✅ `src/exams/exams.service.ts` - Updated 3 methods to support language

## Important Notes

- **Backward Compatible**: The utility functions work with both old and new data formats
- **Default Language**: Romanian (`ro`) is the default if no language specified
- **Fallback**: If Russian translation missing, falls back to Romanian
- **Index-based answers**: The `correctAnswer` index system still works perfectly!

## Testing

Test your API with both languages:
```bash
# Romanian
curl http://localhost:3000/api/practice/1

# Russian
curl http://localhost:3000/api/practice/1?lang=ru
```

---

**Status**: ✅ Service layer updated and ready for multilingual support!
