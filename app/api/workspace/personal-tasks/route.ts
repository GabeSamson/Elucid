import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional().nullable(),
});

// GET - Fetch user's personal tasks
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if we should show all completed tasks
    const { searchParams } = new URL(request.url);
    const showAllCompleted = searchParams.get('showAllCompleted') === 'true';
    const sortBy = searchParams.get('sortBy') || 'priority';

    // Calculate cutoff time (24 hours ago)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Build where clause based on showAllCompleted flag
    const whereClause = showAllCompleted
      ? { userId: session.user.id }
      : {
          userId: session.user.id,
          OR: [
            { completed: false },
            { completedAt: null },
            { completedAt: { gte: twentyFourHoursAgo } },
          ],
        };

    // Build orderBy based on sortBy parameter
    let orderBy: any = [{ completed: 'asc' }];

    if (sortBy === 'priority') {
      orderBy.push({ priority: 'desc' }, { dueDate: 'asc' });
    } else if (sortBy === 'dueDate') {
      orderBy.push({ dueDate: 'asc' }, { priority: 'desc' });
    } else if (sortBy === 'createdAt') {
      orderBy.push({ createdAt: 'asc' });
    }

    const tasks = await prisma.personalTask.findMany({
      where: whereClause,
      orderBy,
    });

    const serializedTasks = tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));

    return NextResponse.json({ tasks: serializedTasks });
  } catch (error) {
    console.error('Fetch personal tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST - Create new personal task
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { title, description, priority, dueDate } = parsed.data;

    const task = await prisma.personalTask.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({
      task: {
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create personal task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH - Update personal task
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { id, title, description, completed, priority, dueDate } = parsed.data;

    // Verify task belongs to user
    const existingTask = await prisma.personalTask.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingTask || existingTask.userId !== session.user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) {
      updateData.completed = completed;
      // Set completedAt when marking as completed, clear it when uncompleting
      updateData.completedAt = completed ? new Date() : null;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.personalTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      task: {
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update personal task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Delete personal task
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const existingTask = await prisma.personalTask.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingTask || existingTask.userId !== session.user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.personalTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete personal task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
