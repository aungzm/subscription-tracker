import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { registerSchema, formatZodError } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const parseResult = registerSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 })
    }

    const { name, email, password } = parseResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash the password
    const hashedPassword = await hash(password, 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        currency: "USD" // default that can be changed later
      },
    })

    // Remove password from the response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error registering user:", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
