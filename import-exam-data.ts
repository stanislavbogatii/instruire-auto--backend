import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface QuestionData {
  bilet: number;
  question_number: number;
  question: {
    ro: string;
    ru: string;
  };
  answers: Array<{
    ro: string;
    ru: string;
  }>;
}

interface ImportData {
  questions: QuestionData[];
}

async function importExamData() {
  try {
    console.log('🚀 Starting exam data import...');

    // Safety check: Verify database is empty or warn user
    const existingQuestions = await prisma.question.count();
    const existingTickets = await prisma.ticket.count();
    
    if (existingQuestions > 0 || existingTickets > 0) {
      console.log(`⚠️  WARNING: Database already contains ${existingQuestions} questions and ${existingTickets} tickets`);
      console.log('❌ Import aborted to prevent duplicates. Clear the database first.');
      return;
    }

    // Read the JSON file
    const jsonPath = path.join(process.cwd(), 'instruire_auto_json.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ImportData;
    
    console.log(`📚 Found ${jsonData.questions.length} questions to import`);

    // Group questions by bilet for ticket creation
    const questionsByBilet = new Map<number, QuestionData[]>();
    jsonData.questions.forEach(q => {
      if (!questionsByBilet.has(q.bilet)) {
        questionsByBilet.set(q.bilet, []);
      }
      questionsByBilet.get(q.bilet)!.push(q);
    });

    console.log(`🎫 Found ${questionsByBilet.size} billets (B1-B${Math.max(...questionsByBilet.keys())})`);

    let questionCount = 0;
    let ticketCount = 0;

    // Process each bilet
    for (const [biletNumber, questions] of questionsByBilet) {
      console.log(`\n📝 Processing Bilet ${biletNumber} with ${questions.length} questions...`);

      // Create ticket for this bilet
      const ticket = await prisma.ticket.create({
        data: {
          name: `Practice Bilet ${biletNumber}`,
        },
      });
      ticketCount++;

      // Process questions in this bilet
      for (const [index, questionData] of questions.entries()) {
        // Check if image exists for this question (try different extensions and patterns)
        let imagePath: string | null = null;
        const questionDir = path.join(process.cwd(), `EXAMEN_INSTRUIRE_AUTO/B${biletNumber}/${questionData.question_number}`);
        
        if (fs.existsSync(questionDir)) {
          // Look for any image file in the question directory
          const files = fs.readdirSync(questionDir);
          const imageFile = files.find(file => 
            file.toLowerCase().endsWith('.jpeg') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.png')
          );
          
          if (imageFile) {
            imagePath = `EXAMEN_INSTRUIRE_AUTO/B${biletNumber}/${questionData.question_number}/${imageFile}`;
          }
        }

        // Prepare answers array for JSON storage
        const answersArray = questionData.answers.map(answer => answer.ro);

        // Create question text (using Romanian version as primary)
        const questionText = questionData.question.ro;

        // Since we don't have correct answers in the JSON, we'll set correctAnswer to 0 for now
        // This should be updated manually or with another data source later
        const correctAnswer = 0; // Default to first answer - THIS NEEDS TO BE CORRECTED LATER

        // Create the question
        const question = await prisma.question.create({
          data: {
            text: questionText,
            image: imagePath,
            answers: JSON.stringify(answersArray),
            correctAnswer: correctAnswer,
          },
        });

        // Link question to ticket
        await prisma.ticketQuestion.create({
          data: {
            ticketId: ticket.id,
            questionId: question.id,
            order: index + 1,
          },
        });

        questionCount++;

        if (questionCount % 50 === 0) {
          console.log(`   ✅ Processed ${questionCount} questions...`);
        }
      }

      console.log(`   🎫 Created ticket "${ticket.name}" with ${questions.length} questions`);
    }

    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Questions imported: ${questionCount}`);
    console.log(`   - Practice tickets created: ${ticketCount}`);
    
    // Count questions with images
    const questionsWithImages = await prisma.question.count({
      where: {
        image: {
          not: null
        }
      }
    });
    console.log(`   - Questions with images: ${questionsWithImages}`);

    console.log(`\n⚠️  IMPORTANT: All questions have correctAnswer set to 0 (first answer).`);
    console.log(`   You need to update the correct answers manually or provide a mapping file.`);

  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importExamData()
    .then(() => {
      console.log('✅ Import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import script failed:', error);
      process.exit(1);
    });
}

export { importExamData };