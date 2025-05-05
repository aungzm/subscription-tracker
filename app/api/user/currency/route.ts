import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get user's currency setting
export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                currency: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ currency: user.currency });
    } catch (error) {
        console.error("Error fetching user currency:", error);
        return NextResponse.json({ error: "Failed to fetch currency setting" }, { status: 500 });
    }
}

// Update user's currency setting
export async function PUT(request: Request) {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        
        if (!body.currency) {
            return NextResponse.json({ error: "Currency is required" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                currency: body.currency,
            },
            select: {
                currency: true,
            },
        });

        return NextResponse.json({
            message: "Currency updated successfully",
            currency: updatedUser.currency,
        });
    } catch (error) {
        console.error("Error updating currency:", error);
        return NextResponse.json({ error: "Failed to update currency" }, { status: 500 });
    }
}