import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Update user password
export async function PUT(request: Request) {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword, repeatPassword } = body;
        
        // Validate inputs
        if (!currentPassword || !newPassword || !repeatPassword) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }
        
        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }
        
        if (newPassword !== repeatPassword) {
            return NextResponse.json({ error: "New passwords don't match" }, { status: 400 });
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                id: true,
                password: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                password: hashedPassword,
            },
        });

        return NextResponse.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
    }
}