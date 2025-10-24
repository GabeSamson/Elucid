import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const email = process.argv[2] || 'admin@elucid.com';
  const password = process.argv[3] || 'admin123';
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Update existing user to admin
      const updated = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          role: 'admin',
          password: await bcrypt.hash(password, 10),
        },
      });
      console.log('Existing user updated to admin!');
      console.log(`Email: ${updated.email}`);
      console.log(`Password: ${password}`);
      console.log('\nYou can now log in at: http://localhost:3000');
      console.log('   Then go to: http://localhost:3000/admin');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: 'Admin',
          role: 'admin',
        },
      });

      console.log('Admin user created successfully!');
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${password}`);
      console.log('\nYou can now log in at: http://localhost:3000');
      console.log('   Then go to: http://localhost:3000/admin');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
