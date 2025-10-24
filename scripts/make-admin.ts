import { prisma } from '../lib/prisma';

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: npx tsx scripts/make-admin.ts your@email.com');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.error(`User with email "${email}" not found`);
      console.log('\nFirst sign in to the website to create your account, then run this script.');
      process.exit(1);
    }

    // Update user role to admin
    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { role: 'admin' },
    });

    console.log('Success!');
    console.log(`${updatedUser.name || updatedUser.email} is now an admin`);
    console.log('\nYou can now access the admin panel at: http://localhost:3000/admin');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
