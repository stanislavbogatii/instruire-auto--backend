const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPermissionCreation() {
  try {
    const instructorId = 6; // Instructor profile ID from user 5
    const createPermissionDto = {
      userId: 6,
      validUntil: '2025-12-31T23:59:59Z',
      maxAttempts: 1
    };
    
    console.log('Testing permission creation...');
    console.log('Instructor ID:', instructorId);
    console.log('Student ID:', createPermissionDto.userId);
    
    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: createPermissionDto.userId },
    });

    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    console.log('✅ Student found:', student.email);

    // Try to create permission
    const result = await prisma.studentExamPermission.upsert({
      where: {
        userId_instructorId: {
          userId: createPermissionDto.userId,
          instructorId,
        },
      },
      update: {
        isActive: true,
        validUntil: new Date(createPermissionDto.validUntil),
        maxAttempts: createPermissionDto.maxAttempts || 3,
        usedAttempts: 0,
      },
      create: {
        userId: createPermissionDto.userId,
        instructorId,
        isActive: true,
        validUntil: new Date(createPermissionDto.validUntil),
        maxAttempts: createPermissionDto.maxAttempts || 3,
        usedAttempts: 0,
      },
      include: {
        user: true,
      },
    });
    
    console.log('✅ Permission created successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissionCreation();