import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const photoshootImages = formData.get('photoshootImages')?.toString() || null;
    const photoshootSlideshow = formData.get('photoshootSlideshow') === 'on';

    await prisma.homepageConfig.upsert({
      where: { id: 'main' },
      update: {
        photoshootImages,
        photoshootSlideshow,
      },
      create: {
        id: 'main',
        photoshootImages,
        photoshootSlideshow,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/homepage');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update photoshoot gallery:', error);
    return NextResponse.json(
      { error: 'Failed to update photoshoot gallery' },
      { status: 500 }
    );
  }
}
