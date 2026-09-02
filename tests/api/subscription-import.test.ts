import { POST } from "@/app/api/subscriptions/import/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import type { PrismaClient } from "@prisma/client"
import type { DeepMockProxy } from "jest-mock-extended"
import {
  CATEGORY_IDS,
  PAYMENT_METHOD_IDS,
  USER_IDS,
} from "../../prisma/test-ids"
import {
  createMockCategory,
  createMockPaymentMethod,
  createMockSubscription,
} from "../factories"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}))

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

const mockedAuth = auth as jest.MockedFunction<typeof auth>
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>
const mockedRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>

type ApiResponse<T> = { body: T; init?: { status: number } }

describe("POST /api/subscriptions/import", () => {
  const session = {
    user: {
      id: USER_IDS.ALICE,
      name: "Alice Test",
      email: "alice@test.com",
      image: null,
    },
    expires: "2099-12-31T23:59:59.999Z",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue(session)
  })

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null)

    const req = new Request("http://localhost/api/subscriptions/import", {
      method: "POST",
      body: JSON.stringify({ subscriptions: [] }),
    })

    const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>

    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(res.init).toEqual({ status: 401 })
  })

  it("returns 400 for invalid payloads", async () => {
    const req = new Request("http://localhost/api/subscriptions/import", {
      method: "POST",
      body: JSON.stringify({
        subscriptions: [
          {
            name: "",
            cost: -1,
            currency: "USD",
            billingFrequency: "yearly",
            startDate: "not-a-date",
          },
        ],
      }),
    })

    const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>

    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(res.init).toEqual({ status: 400 })
    expect(mockedPrisma.subscription.create).not.toHaveBeenCalled()
  })

  it("returns 400 when a category is not owned by the user", async () => {
    mockedPrisma.category.findFirst.mockResolvedValueOnce(null)

    const req = new Request("http://localhost/api/subscriptions/import", {
      method: "POST",
      body: JSON.stringify({
        subscriptions: [
          {
            name: "Netflix",
            cost: 15.99,
            currency: "USD",
            billingFrequency: "monthly",
            startDate: "2026-01-01",
            category: CATEGORY_IDS.PRODUCTIVITY,
          },
        ],
      }),
    })

    const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>

    expect(res.body).toEqual({ error: "Invalid category" })
    expect(res.init).toEqual({ status: 400 })
    expect(mockedPrisma.subscription.create).not.toHaveBeenCalled()
  })

  it("returns 400 when a payment method is not owned by the user", async () => {
    mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null)

    const req = new Request("http://localhost/api/subscriptions/import", {
      method: "POST",
      body: JSON.stringify({
        subscriptions: [
          {
            name: "Netflix",
            cost: 15.99,
            currency: "USD",
            billingFrequency: "monthly",
            startDate: "2026-01-01",
            paymentMethod: PAYMENT_METHOD_IDS.PAYPAL,
          },
        ],
      }),
    })

    const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>

    expect(res.body).toEqual({ error: "Invalid payment method" })
    expect(res.init).toEqual({ status: 400 })
    expect(mockedPrisma.subscription.create).not.toHaveBeenCalled()
  })

  it("imports confirmed monthly subscriptions", async () => {
    const category = createMockCategory()
    const paymentMethod = createMockPaymentMethod()
    const createdSubscription = {
      ...createMockSubscription({
        name: "Netflix",
        cost: 15.99,
        billingFrequency: "monthly",
        currency: "USD",
        categoryId: CATEGORY_IDS.STREAMING,
        paymentMethodId: PAYMENT_METHOD_IDS.VISA,
      }),
      category,
      paymentMethod,
    }

    mockedPrisma.category.findFirst.mockResolvedValueOnce(category)
    mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(paymentMethod)
    mockedPrisma.subscription.create.mockResolvedValueOnce(createdSubscription as any)

    const req = new Request("http://localhost/api/subscriptions/import", {
      method: "POST",
      body: JSON.stringify({
        subscriptions: [
          {
            name: "Netflix",
            cost: 15.99,
            currency: "USD",
            billingFrequency: "monthly",
            startDate: "2026-01-01",
            category: CATEGORY_IDS.STREAMING,
            paymentMethod: PAYMENT_METHOD_IDS.VISA,
          },
        ],
      }),
    })

    const res = (await POST(req)) as unknown as ApiResponse<{
      imported: number
      subscriptions: unknown[]
    }>

    expect(res.body.imported).toBe(1)
    expect(res.body.subscriptions).toHaveLength(1)
    expect(mockedPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Netflix",
          cost: 15.99,
          userId: USER_IDS.ALICE,
          billingFrequency: "monthly",
          endDate: null,
          categoryId: CATEGORY_IDS.STREAMING,
          paymentMethodId: PAYMENT_METHOD_IDS.VISA,
        }),
      })
    )
    expect(mockedRevalidateTag).toHaveBeenCalledWith("dashboard")
    expect(mockedRevalidateTag).toHaveBeenCalledWith("analytics")
  })
})
