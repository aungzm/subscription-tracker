// tests/api/payment-methods/payment-methods.test.ts

import { GET as getRootHandler, POST } from "@/app/api/payment/route";
import { GET, PATCH, DELETE } from "@/app/api/payment/[id]/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, PAYMENT_METHOD_IDS } from "../../prisma/test-ids";
import { createMockPaymentMethod } from "../factories";
import type { PaymentMethod } from "@prisma/client";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedNextJson = NextResponse.json as unknown as jest.MockedFunction<
  <T>(body: T, init?: { status: number }) => { body: T; init?: { status: number } }
>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Payment Methods", () => {
  const aliceId = USER_IDS.ALICE;
  const bobId = USER_IDS.BOB;
  const visaPaymentId = PAYMENT_METHOD_IDS.VISA;
  const mastercardPaymentId = PAYMENT_METHOD_IDS.MASTERCARD;
  const aliceSession = {
    user: {
      id: aliceId,
      name: "Alice Test",
      email: "alice@test.com",
      image: null
    },
    expires: "2025-12-31T23:59:59.999Z"
  };
  const bobSession = {
    user: {
      id: bobId,
      name: "Bob Test",
      email: "bob@test.com",
      image: null
    },
    expires: "2025-12-31T23:59:59.999Z"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(aliceSession);
  });

  describe("GET /api/payment-methods (list all)", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await getRootHandler()) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.paymentMethod.findMany.mockRejectedValueOnce(new Error("DB findMany failure"));
      const res = (await getRootHandler()) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch payment methods" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch payment methods" });
    });

    it("returns sorted payment methods for authenticated user", async () => {
      const now = new Date();
      const visaPayment = createMockPaymentMethod({
        id: PAYMENT_METHOD_IDS.VISA,
        name: "Visa",
        type: "CREDIT_CARD",
        createdAt: new Date(now.getTime() - 1000),
      });
      const paypalPayment = createMockPaymentMethod({
        id: PAYMENT_METHOD_IDS.PAYPAL,
        name: "PayPal",
        type: "PAYPAL",
        createdAt: now,
      });
      mockedPrisma.paymentMethod.findMany.mockResolvedValueOnce([visaPayment, paypalPayment]);

      const res = (await getRootHandler()) as unknown as ApiResponse<PaymentMethod[]>;
      const paymentMethods = res.body;
      expect(Array.isArray(paymentMethods)).toBe(true);
      expect(paymentMethods.length).toBe(2);
      expect(paymentMethods).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: PAYMENT_METHOD_IDS.VISA,
            userId: aliceId,
            name: "Visa",
            type: "CREDIT_CARD"
          }),
          expect.objectContaining({
            id: PAYMENT_METHOD_IDS.PAYPAL,
            userId: aliceId,
            name: "PayPal",
            type: "PAYPAL"
          }),
        ])
      );

      // Verify they're sorted by createdAt ascending
      for (let i = 1; i < paymentMethods.length; i++) {
        const prev = new Date(paymentMethods[i - 1].createdAt);
        const curr = new Date(paymentMethods[i].createdAt);
        expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
      }

      expect(mockedPrisma.paymentMethod.findMany).toHaveBeenCalled();
    });
  });

  describe("POST /api/payment-methods (create)", () => {
    const newPaymentMethod = {
      name: "My Credit Card",
      type: "CREDIT_CARD",
      lastFour: "9999",
      expiryDate: "2026-12-31T23:59:59.000Z"
    };

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPaymentMethod),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database create failure", async () => {
      mockedPrisma.paymentMethod.create.mockRejectedValueOnce(new Error("DB create failure"));
      const req = new Request("http://localhost/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPaymentMethod),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to create payment method" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to create payment method" });
    });

    it("creates payment method with all fields", async () => {
      const createdPayment = createMockPaymentMethod({
        id: "new-payment-id",
        name: newPaymentMethod.name,
        type: "CREDIT_CARD",
        lastFour: newPaymentMethod.lastFour,
        expiryDate: new Date(newPaymentMethod.expiryDate),
      });
      mockedPrisma.paymentMethod.create.mockResolvedValueOnce(createdPayment);

      const req = new Request("http://localhost/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPaymentMethod),
      });
      const res = (await POST(req)) as unknown as ApiResponse<PaymentMethod>;
      const created = res.body;
      expect(created).toMatchObject({
        name: newPaymentMethod.name,
        type: newPaymentMethod.type,
        lastFour: newPaymentMethod.lastFour,
        userId: aliceId,
      });
      expect(created.id).toBeDefined();
      expect(new Date(created.expiryDate!).toISOString()).toBe(newPaymentMethod.expiryDate);

      expect(mockedPrisma.paymentMethod.create).toHaveBeenCalled();
    });

    it("creates payment method with minimal fields (name and type only)", async () => {
      const minimalPayment = { name: "Basic Card", type: "DEBIT_CARD" };
      const createdPayment = createMockPaymentMethod({
        id: "new-minimal-payment-id",
        name: "Basic Card",
        type: "DEBIT_CARD",
        lastFour: null,
        expiryDate: null,
      });
      mockedPrisma.paymentMethod.create.mockResolvedValueOnce(createdPayment);

      const req = new Request("http://localhost/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minimalPayment),
      });
      const res = (await POST(req)) as unknown as ApiResponse<PaymentMethod>;
      const created = res.body;

      expect(created).toMatchObject({
        name: "Basic Card",
        type: "DEBIT_CARD",
        lastFour: null,
        expiryDate: null,
        userId: aliceId,
      });
      expect(created.id).toBeDefined();

      expect(mockedPrisma.paymentMethod.create).toHaveBeenCalled();
    });
  });

  describe("GET /api/payment-methods/[id] (get single)", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when payment method not found", async () => {
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/nonexistent`);
      const ctx = { params: { id: "nonexistent" } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 404 when payment method belongs to different user", async () => {
      // Alice trying to access Bob's payment method - returns null because findFirst filters by userId
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/${mastercardPaymentId}`);
      const ctx = { params: { id: mastercardPaymentId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 500 on database error", async () => {
      mockedPrisma.paymentMethod.findFirst.mockRejectedValueOnce(new Error("DB failure"));

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch payment method" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch payment method" });
    });

    it("returns payment method for authorized user", async () => {
      const payment = createMockPaymentMethod({
        id: visaPaymentId,
        name: "Visa",
        type: "CREDIT_CARD",
        lastFour: "1234",
      });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(payment);

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<PaymentMethod>;

      expect(res.body).toMatchObject({
        id: visaPaymentId,
        userId: aliceId,
        name: "Visa",
        type: "CREDIT_CARD",
        lastFour: "1234"
      });
    });
  });

  describe("PATCH /api/payment-methods/[id] (update)", () => {
    const updateData = {
      name: "Updated Visa",
      type: "DEBIT_CARD",
      lastFour: "4321",
      expiryDate: "2027-06-30T23:59:59.000Z"
    };

    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: visaPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when payment method not found", async () => {
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/nonexistent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: "nonexistent" }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 404 when payment method belongs to different user", async () => {
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/${mastercardPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: mastercardPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 500 on database update failure", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);
      mockedPrisma.paymentMethod.update.mockRejectedValueOnce(new Error("Update failure"));

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: visaPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update payment method" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to update payment method" });
    });

    it("updates payment method with full data", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);

      const updatedPayment = createMockPaymentMethod({
        id: visaPaymentId,
        name: updateData.name,
        type: "DEBIT_CARD",
        lastFour: updateData.lastFour,
        expiryDate: new Date(updateData.expiryDate),
      });
      mockedPrisma.paymentMethod.update.mockResolvedValueOnce(updatedPayment);

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: visaPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<PaymentMethod>;

      expect(res.body).toMatchObject({
        id: visaPaymentId,
        userId: aliceId,
        name: updateData.name,
        type: updateData.type,
        lastFour: updateData.lastFour,
      });
      expect(new Date(res.body.expiryDate!).toISOString()).toBe(updateData.expiryDate);

      expect(mockedPrisma.paymentMethod.update).toHaveBeenCalled();
    });

    it("updates payment method with partial data (name only)", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);

      const partialUpdate = { name: "Updated Name Only" };
      const updatedPayment = createMockPaymentMethod({
        id: visaPaymentId,
        name: "Updated Name Only",
      });
      mockedPrisma.paymentMethod.update.mockResolvedValueOnce(updatedPayment);

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: visaPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<PaymentMethod>;

      expect(res.body).toMatchObject({
        id: visaPaymentId,
        userId: aliceId,
        name: "Updated Name Only",
      });

      expect(mockedPrisma.paymentMethod.update).toHaveBeenCalled();
    });

    it("updates payment method with partial data (clears expiryDate)", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);

      const partialUpdate = { expiryDate: null };
      const updatedPayment = createMockPaymentMethod({
        id: visaPaymentId,
        expiryDate: null,
      });
      mockedPrisma.paymentMethod.update.mockResolvedValueOnce(updatedPayment);

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: visaPaymentId }) };

      const res = (await PATCH(req, ctx)) as unknown as ApiResponse<PaymentMethod>;

      expect(res.body).toMatchObject({
        id: visaPaymentId,
        userId: aliceId,
        expiryDate: null,
      });

      expect(mockedPrisma.paymentMethod.update).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/payment-methods/[id] (delete)", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when payment method not found", async () => {
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/nonexistent`);
      const ctx = { params: { id: "nonexistent" } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 404 when payment method belongs to different user", async () => {
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/payment-methods/${mastercardPaymentId}`);
      const ctx = { params: { id: mastercardPaymentId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Payment method not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Payment method not found" });
    });

    it("returns 500 on database error", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);
      mockedPrisma.paymentMethod.delete.mockRejectedValueOnce(new Error("Delete failure"));

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete payment method" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to delete payment method" });
    });

    it("deletes payment method and returns success message", async () => {
      const existingPayment = createMockPaymentMethod({ id: visaPaymentId });
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPayment);
      mockedPrisma.paymentMethod.delete.mockResolvedValueOnce(existingPayment);

      const req = new Request(`http://localhost/api/payment-methods/${visaPaymentId}`);
      const ctx = { params: { id: visaPaymentId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ message: string }>;

      expect(res.body).toEqual({ message: "Payment method deleted successfully" });

      expect(mockedPrisma.paymentMethod.delete).toHaveBeenCalled();
    });
  });
});
