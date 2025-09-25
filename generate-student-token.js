const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function generateStudentToken() {
  try {
    const student = await prisma.user.findUnique({
      where: { id: 1 },
    });
    
    if (!student) {
      throw new Error('Student with ID 1 not found');
    }
    
    const payload = {
      sub: student.id,
      email: student.email,
      data: { 
        name: `${student.firstName} ${student.lastName}`, 
        phone: student.phone || '', 
        role: student.role 
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
    };
    
    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(payload, secret);
    
    console.log('Student info:');
    console.log('- ID:', student.id);
    console.log('- Email:', student.email);
    console.log('- Name:', `${student.firstName} ${student.lastName}`);
    console.log('- Role:', student.role);
    console.log();
    console.log('Generated JWT token for student:');
    console.log(token);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateStudentToken();