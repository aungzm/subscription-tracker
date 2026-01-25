import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET a single reminder by id
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { subscription: true },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error fetching reminder:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder" },
      { status: 500 }
    );
  }
}

// PUT to update an existing reminder by id
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await context.params;
    const body = await request.json();
    const { reminderDate, isRead } = body;

    // Verify that the reminder belongs to the current user
    const existingReminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: params.id, userId: session.user.id },
      data: {
        reminderDate:
          reminderDate !== undefined
            ? new Date(reminderDate)
            : existingReminder.reminderDate,
        isRead: isRead !== undefined ? isRead : existingReminder.isRead,
      },
      include: { subscription: true },
    });

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

// DELETE a reminder by id
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    // Verify that the reminder belongs to the current user
    const existingReminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.reminder.delete({
      where: { id: params.id, userId: session.user.id },
    });

    return NextResponse.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
