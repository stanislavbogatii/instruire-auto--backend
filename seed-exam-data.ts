import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exam data...');

  // Create sample questions
  const questions = [
    {
      text: 'What is the maximum speed limit in populated areas in Romania?',
      image: null,
      answers: JSON.stringify(['30 km/h', '50 km/h', '60 km/h', '70 km/h']),
      correctAnswer: 1,
    },
    {
      text: 'When should you use the emergency lights?',
      image: null,
      answers: JSON.stringify([
        'Only when parking',
        'When the car breaks down or in emergency situations',
        'Only at night',
        'When driving in rain',
      ]),
      correctAnswer: 1,
    },
    {
      text: 'What distance should you maintain from the car in front on a highway?',
      image: null,
      answers: JSON.stringify(['1 meter', '2 meters', 'At least 3 seconds rule', '10 meters']),
      correctAnswer: 2,
    },
    {
      text: 'What should you do when approaching a pedestrian crossing?',
      image: null,
      answers: JSON.stringify([
        'Speed up to pass quickly',
        'Reduce speed and be prepared to stop',
        'Honk to warn pedestrians',
        'Maintain the same speed',
      ]),
      correctAnswer: 1,
    },
    {
      text: 'When is it mandatory to use headlights during the day?',
      image: null,
      answers: JSON.stringify([
        'Never during the day',
        'Only in tunnels and bad weather',
        'Always outside populated areas',
        'Only when it\'s cloudy',
      ]),
      correctAnswer: 2,
    },
  ];

  const createdQuestions: any[] = [];
  for (const question of questions) {
    const created = await prisma.question.create({ data: question });
    createdQuestions.push(created);
    console.log(`Created question: ${created.id}`);
  }

  // Create more questions for different tickets
  const moreQuestions = [
    {
      text: 'What is the legal blood alcohol limit for drivers in Romania?',
      image: null,
      answers: JSON.stringify(['0.0‰', '0.5‰', '0.8‰', '1.0‰']),
      correctAnswer: 0,
    },
    {
      text: 'How should you behave at a roundabout?',
      image: null,
      answers: JSON.stringify([
        'Enter without looking',
        'Give way to vehicles already in the roundabout',
        'Always stop before entering',
        'Speed up to enter quickly',
      ]),
      correctAnswer: 1,
    },
    {
      text: 'What is the minimum age to obtain a driving license for category B in Romania?',
      image: null,
      answers: JSON.stringify(['16 years', '17 years', '18 years', '21 years']),
      correctAnswer: 2,
    },
    {
      text: 'When should you use the turn signals?',
      image: null,
      answers: JSON.stringify([
        'Only when turning left',
        'Only when changing lanes',
        'Before any maneuver that changes direction',
        'Only at intersections',
      ]),
      correctAnswer: 2,
    },
    {
      text: 'What should you do if you encounter an ambulance with sirens?',
      image: null,
      answers: JSON.stringify([
        'Continue driving normally',
        'Speed up to get out of the way',
        'Pull over safely and let it pass',
        'Follow it closely',
      ]),
      correctAnswer: 2,
    },
  ];

  for (const question of moreQuestions) {
    const created = await prisma.question.create({ data: question });
    createdQuestions.push(created);
    console.log(`Created question: ${created.id}`);
  }

  // Create sample tickets
  const ticket1Questions = createdQuestions.slice(0, 5).map(q => q.id);
  const ticket2Questions = createdQuestions.slice(3, 8).map(q => q.id); // Some overlap
  const ticket3Questions = createdQuestions.slice(5, 10).map(q => q.id);

  // Create tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      name: 'Traffic Rules Basics',
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      name: 'Safety and Emergency Procedures',
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      name: 'Legal Requirements and Signs',
    },
  });

  console.log(`Created tickets: ${ticket1.id}, ${ticket2.id}, ${ticket3.id}`);

  // Associate questions with tickets
  const ticketQuestions = [
    ...ticket1Questions.map((questionId, index) => ({
      ticketId: ticket1.id,
      questionId,
      order: index + 1,
    })),
    ...ticket2Questions.map((questionId, index) => ({
      ticketId: ticket2.id,
      questionId,
      order: index + 1,
    })),
    ...ticket3Questions.map((questionId, index) => ({
      ticketId: ticket3.id,
      questionId,
      order: index + 1,
    })),
  ];

  await prisma.ticketQuestion.createMany({
    data: ticketQuestions,
  });

  console.log('✅ Seed data created successfully!');
  console.log(`Created ${createdQuestions.length} questions and 3 tickets`);
  console.log('You can now test the exam module with this data.');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
