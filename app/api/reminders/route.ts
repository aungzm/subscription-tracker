import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reminderCreateSchema, formatZodError } from "@/lib/validations";
import { getDaysBeforeFromPreset, reminderPresetToDbValue } from "@/lib/reminder-schedule";

async function validateNotificationProviderOwnership(
  providerIds: string[],
  userId: string
) {
  const uniqueProviderIds = Array.from(new Set(providerIds))

  if (uniqueProviderIds.length === 0) {
    return true
  }

  const ownedProviders = await prisma.notificationProvider.findMany({
    where: {
      id: { in: uniqueProviderIds },
      userId,
    },
    select: { id: true },
  })

  return ownedProviders.length === uniqueProviderIds.length
}

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
      orderBy: { nextSendAt: "asc" },
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

    const parseResult = reminderCreateSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 })
    }

    const {
      subscriptionId,
      reminderDate,
      reminderPreset,
      nextSendAt,
      notificationProviderIds,
      id,
    } = parseResult.data
    const daysBefore = getDaysBeforeFromPreset(reminderPreset)
    const preset = reminderPresetToDbValue(reminderPreset)

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

    const providersAreOwned = await validateNotificationProviderOwnership(
      notificationProviderIds,
      session.user.id
    )

    if (!providersAreOwned) {
      return NextResponse.json(
        { error: "Invalid notification provider" },
        { status: 400 }
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
          preset,
          daysBefore,
          nextSendAt: nextSendAt ? new Date(nextSendAt) : null,
          notificationProviders: {
            set: notificationProviderIds.map((id: string) => ({ id })),
          },
        },
      })
    } else {
      // Create new reminder
      reminder = await prisma.reminder.create({
        data: {
          reminderDate: new Date(reminderDate),
          preset,
          daysBefore,
          nextSendAt: nextSendAt ? new Date(nextSendAt) : null,
          userId: session.user.id,
          subscriptionId,
          notificationProviders: {
            connect: notificationProviderIds.map((id: string) => ({ id })),
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
