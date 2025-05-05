import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get user details including currency
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
                email: true,
                name: true,
                image: true,
                currency: true,  // Added currency field
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching user details:", error);
        return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
    }
}

// Update user profile including currency
export async function PUT(request: Request) {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const updatedUser = await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                name: body.name,
                image: body.image,
                currency: body.currency, // Added currency field
            },
        });

        return NextResponse.json({
            message: "User updated successfully",
            user: {
                email: updatedUser.email,
                name: updatedUser.name,
                image: updatedUser.image,
                currency: updatedUser.currency, // Added currency field
            },
        });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

// Delete user account (unchanged)
export async function DELETE() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.delete({
            where: {
                id: session.user.id,
            },
        });

        return NextResponse.json({ message: "User account deleted successfully" });
    } catch (error) {
        console.error("Error deleting user account:", error);
        return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 });
    }
}