import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session.user;
};

// GET - Fetch all team tasks
export async function GET(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
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
      ? {}
      : {
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

    const tasks = await prisma.teamTask.findMany({
      where: whereClause,
      orderBy,
    });

    // Fetch assigned users
    const userIds = tasks
      .map((t) => t.assignedTo)
      .filter((id): id is string => Boolean(id));

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = users.reduce<Record<string, { name: string | null; email: string }>>((acc, u) => {
      acc[u.id] = { name: u.name, email: u.email };
      return acc;
    }, {});

    const serializedTasks = tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignedUser: task.assignedTo ? userMap[task.assignedTo] : null,
    }));

    return NextResponse.json({ tasks: serializedTasks });
  } catch (error) {
    console.error('Fetch team tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST - Create new team task
export async function POST(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
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

    const { title, description, priority, assignedTo, dueDate } = parsed.data;

    const task = await prisma.teamTask.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: user.id,
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
    console.error('Create team task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH - Update team task
export async function PATCH(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
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

    const { id, title, description, completed, priority, assignedTo, dueDate } = parsed.data;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) {
      updateData.completed = completed;
      // Set completedAt when marking as completed, clear it when uncompleting
      updateData.completedAt = completed ? new Date() : null;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.teamTask.update({
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
    console.error('Update team task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Delete team task
export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await prisma.teamTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
