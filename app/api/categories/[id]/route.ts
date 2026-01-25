import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryUpdateSchema, formatZodError } from "@/lib/validations";

// GET /api/categories/:id - Get a specific category
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
    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });
    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT /api/categories/:id - Update a category
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

    const parseResult = categoryUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    const category = await prisma.category.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        name: validatedData.name,
        color: validatedData.color,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/:id - Delete a category
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
    await prisma.category.delete({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });
    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
