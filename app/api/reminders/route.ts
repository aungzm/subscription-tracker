import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all reminders for the logged-in user
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
      where: { userId: session.user.id },
      include: { subscription: true },
      orderBy: { reminderDate: "asc" },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

// POST a new reminder
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, reminderDate, notificationProviderIds, id } = body

    // Validate the subscription belongs to the current user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    let reminder

    if (id) {
      // Update existing reminder
      reminder = await prisma.reminder.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: {
          reminderDate: new Date(reminderDate),
          // Clear existing notification providers and set new ones
          notificationProviders: {
            disconnect: { id: '*' }, // Disconnect all existing
            connect: notificationProviderIds.map((id: any) => ({ id })),
          },
        },
      })
    } else {
      // Create new reminder
      reminder = await prisma.reminder.create({
        data: {
          reminderDate: new Date(reminderDate),
          userId: session.user.id,
          subscriptionId,
          notificationProviders: {
            connect: notificationProviderIds.map((id: any) => ({ id })),
          },
        },
      })
    }

    return NextResponse.json(reminder)
  } catch (error) {
    console.error("Error creating/updating reminder:", error)
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    )
  }
}