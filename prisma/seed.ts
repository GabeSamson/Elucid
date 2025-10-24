import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@elucidldn.com' },
    update: {},
    create: {
      email: 'admin@elucidldn.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create collections
  const essentials = await prisma.collection.upsert({
    where: { slug: 'essentials' },
    update: {},
    create: {
      name: 'Essentials',
      slug: 'essentials',
      description: 'Timeless pieces for everyday wear',
    },
  })

  const newArrivals = await prisma.collection.upsert({
    where: { slug: 'new-arrivals' },
    update: {},
    create: {
      name: 'New Arrivals',
      slug: 'new-arrivals',
      description: 'Fresh drops from the streets',
    },
  })

  const limitedEdition = await prisma.collection.upsert({
    where: { slug: 'limited-edition' },
    update: {},
    create: {
      name: 'Limited Edition',
      slug: 'limited-edition',
      description: 'Exclusive releases in limited quantities',
    },
  })

  console.log('Created collections')

  // Create sample products
  await prisma.product.upsert({
    where: { id: 'prod-1' },
    update: {},
    create: {
      id: 'prod-1',
      name: 'Oversized Tee - Black',
      description: 'Premium heavyweight cotton oversized t-shirt with subtle branding. Designed for comfort and style, this essential piece features a relaxed fit perfect for any casual occasion.',
      price: 45.00,
      stock: 100,
      featured: true,
      sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
      colors: JSON.stringify(['Black']),
      images: JSON.stringify([]),
      collectionId: essentials.id,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-2' },
    update: {},
    create: {
      id: 'prod-2',
      name: 'Vintage Wash Hoodie',
      description: 'Acid-washed heavyweight hoodie with embroidered details. Each piece is unique due to the vintage washing process, creating a one-of-a-kind garment.',
      price: 85.00,
      stock: 75,
      featured: true,
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      colors: JSON.stringify(['Charcoal', 'Cream']),
      images: JSON.stringify([]),
      collectionId: essentials.id,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-3' },
    update: {},
    create: {
      id: 'prod-3',
      name: 'Cargo Pants - Charcoal',
      description: 'Relaxed fit cargo pants with utility pockets and adjustable cuffs. Constructed from durable cotton twill, these pants blend functionality with contemporary street style.',
      price: 95.00,
      compareAtPrice: 110.00,
      stock: 50,
      featured: true,
      sizes: JSON.stringify(['28', '30', '32', '34', '36']),
      colors: JSON.stringify(['Charcoal', 'Olive']),
      images: JSON.stringify([]),
      collectionId: newArrivals.id,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-4' },
    update: {},
    create: {
      id: 'prod-4',
      name: 'Logo Cap',
      description: 'Classic six-panel cap with embroidered logo. Features an adjustable strap for the perfect fit.',
      price: 35.00,
      stock: 150,
      sizes: JSON.stringify(['One Size']),
      colors: JSON.stringify(['Black', 'Cream', 'Olive']),
      images: JSON.stringify([]),
      collectionId: essentials.id,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-5' },
    update: {},
    create: {
      id: 'prod-5',
      name: 'Crewneck Sweatshirt',
      description: 'Premium cotton fleece crewneck with minimalist branding. Perfect weight for layering or wearing alone.',
      price: 65.00,
      stock: 90,
      sizes: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      colors: JSON.stringify(['Black', 'Cream', 'Charcoal']),
      images: JSON.stringify([]),
      collectionId: essentials.id,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-6' },
    update: {},
    create: {
      id: 'prod-6',
      name: 'Limited Edition Coach Jacket',
      description: 'Water-resistant coach jacket with premium hardware. Limited run of 100 pieces, each numbered.',
      price: 120.00,
      compareAtPrice: 145.00,
      stock: 15,
      sizes: JSON.stringify(['M', 'L', 'XL']),
      colors: JSON.stringify(['Black']),
      images: JSON.stringify([]),
      collectionId: limitedEdition.id,
    },
  })

  console.log('Created sample products')

  await prisma.homepageConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      heroHeading: 'Shade to the light',
      heroSubheading: 'Limited drops. Crafted for evenings in London.',
      heroCtaLabel: 'Explore Collection',
      heroCtaHref: '/shop',
      customContent: 'Sign up for early access to our next release.',
      showCountdown: false,
    },
  })

  console.log('Initialised homepage configuration')

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
