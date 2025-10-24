import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all products and collections...');

  // Delete all order items first (foreign key constraint)
  await prisma.orderItem.deleteMany({});
  console.log('Deleted all order items');

  // Delete all orders (except keep admin user orders if any)
  await prisma.order.deleteMany({});
  console.log('Deleted all orders');

  // Delete all products
  await prisma.product.deleteMany({});
  console.log('Deleted all products');

  // Delete all collections
  await prisma.collection.deleteMany({});
  console.log('Deleted all collections');

  // Delete newsletter subscribers (optional)
  await prisma.newsletter.deleteMany({});
  console.log('Deleted all newsletter subscribers');

  console.log('\nDatabase cleared! Only the admin user remains.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
