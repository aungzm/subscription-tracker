import {
  currencyUpdateSchema,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  profileUpdateSchema,
  reminderCreateSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
} from "@/lib/validations";

describe("validation schemas", () => {
  describe("date fields", () => {
    it("accepts valid subscription dates", () => {
      expect(
        subscriptionCreateSchema.safeParse({
          name: "Netflix",
          cost: 15.99,
          billingFrequency: "monthly",
          startDate: "2026-01-01",
          endDate: "2026-12-31T00:00:00.000Z",
          currency: "USD",
        }).success
      ).toBe(true);
    });

    it("rejects invalid subscription dates", () => {
      expect(
        subscriptionCreateSchema.safeParse({
          name: "Netflix",
          cost: 15.99,
          billingFrequency: "monthly",
          startDate: "not-a-date",
          currency: "USD",
        }).success
      ).toBe(false);

      expect(
        subscriptionUpdateSchema.safeParse({
          endDate: "not-a-date",
        }).success
      ).toBe(false);
    });

    it("keeps optional nullable dates valid for partial updates", () => {
      expect(subscriptionUpdateSchema.safeParse({ name: "Netflix" }).success).toBe(
        true
      );
      expect(subscriptionUpdateSchema.safeParse({ endDate: null }).success).toBe(
        true
      );
      expect(paymentMethodUpdateSchema.safeParse({ expiryDate: null }).success).toBe(
        true
      );
    });

    it("rejects invalid reminder dates", () => {
      expect(
        reminderCreateSchema.safeParse({
          subscriptionId: "subscription-1",
          reminderDate: "not-a-date",
          nextSendAt: "2026-01-01T00:00:00.000Z",
        }).success
      ).toBe(false);

      expect(
        reminderCreateSchema.safeParse({
          subscriptionId: "subscription-1",
          reminderDate: "2026-01-01T00:00:00.000Z",
          nextSendAt: "not-a-date",
        }).success
      ).toBe(false);
    });

    it("rejects invalid payment expiry dates", () => {
      expect(
        paymentMethodCreateSchema.safeParse({
          name: "Visa",
          type: "CREDIT_CARD",
          expiryDate: "not-a-date",
        }).success
      ).toBe(false);
    });
  });

  describe("currency fields", () => {
    it("accepts and normalizes valid ISO currency codes", () => {
      expect(currencyUpdateSchema.parse({ currency: "usd" })).toEqual({
        currency: "USD",
      });

      expect(profileUpdateSchema.parse({ currency: " eur " })).toEqual({
        currency: "EUR",
      });
    });

    it("rejects invalid currency codes", () => {
      expect(currencyUpdateSchema.safeParse({ currency: "" }).success).toBe(false);
      expect(currencyUpdateSchema.safeParse({ currency: "USDX" }).success).toBe(
        false
      );
      expect(currencyUpdateSchema.safeParse({ currency: "ZZZ" }).success).toBe(false);
      expect(subscriptionCreateSchema.safeParse({
        name: "Netflix",
        cost: 15.99,
        billingFrequency: "monthly",
        startDate: "2026-01-01",
        currency: "not-money",
      }).success).toBe(false);
    });
  });
});
