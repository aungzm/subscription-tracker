import { mockReset } from "jest-mock-extended";
import { prisma } from "@/lib/db";

// Mock the db module
jest.mock("@/lib/db");

// Reset all mocks before each test
beforeEach(() => {
  mockReset(prisma);
});
