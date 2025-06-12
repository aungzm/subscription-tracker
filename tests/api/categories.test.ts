// tests/api/categories/categories.test.ts

import { GET as getRootHandler, POST } from "@/app/api/categories/route";
import { GET, PUT, DELETE } from "@/app/api/categories/[id]/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_IDS, CATEGORY_IDS } from "../../prisma/test-ids";
import type { Category } from "@prisma/client";

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

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Categories", () => {
  const aliceId = USER_IDS.ALICE;
  const streamingCatId = CATEGORY_IDS.STREAMING;
  const session = { 
    user: { 
      id: aliceId,
      name: "Alice Test",
      email: "alice@test.com",
      image: null
    }, 
    expires: "2025-12-31T23:59:59.999Z" 
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  describe("GET /api/categories (list all)", () => {
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
      jest
        .spyOn(prisma.category, "findMany")
        .mockRejectedValueOnce(new Error("DB findMany failure"));
      const res = (await getRootHandler()) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch categories" });
    });

    it("returns sorted categories for authenticated user", async () => {
      const res = (await getRootHandler()) as unknown as ApiResponse<Category[]>;
      const cats = res.body;
      expect(Array.isArray(cats)).toBe(true);

      // Alice should have at least STREAMING and PRODUCTIVITY from seed data
      expect(cats.length).toBeGreaterThanOrEqual(2);
      expect(cats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            id: CATEGORY_IDS.STREAMING,
            userId: aliceId,
            name: "Streaming"
          }),
          expect.objectContaining({ 
            id: CATEGORY_IDS.PRODUCTIVITY,
            userId: aliceId,
            name: "Productivity"
          }),
        ])
      );

      // Verify they're sorted by createdAt ascending
      for (let i = 1; i < cats.length; i++) {
        const prev = new Date(cats[i - 1].createdAt);
        const curr = new Date(cats[i].createdAt);
        expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
      }
    });
  });

  describe("POST /api/categories (create)", () => {
    const newName = "My Test Cat";
    const customColor = "#ABCDEF";

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
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
      jest
        .spyOn(prisma.category, "create")
        .mockRejectedValueOnce(new Error("DB create failure"));
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, color: customColor }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to create category" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to create category" });
    });

    it("creates category with provided color", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, color: customColor }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<Category>;
      const created = res.body;
      expect(created).toMatchObject({
        name: newName,
        color: customColor,
        userId: aliceId,
      });
      expect(created.id).toBeDefined();

      // verify persisted
      const dbCat = await prisma.category.findUnique({
        where: { id: created.id },
      });
      expect(dbCat).not.toBeNull();
      expect(dbCat).toMatchObject({
        name: newName,
        color: customColor,
        userId: aliceId,
      });
    });

    it("creates category with default color when none given", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Default Cat" }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<Category>;
      const created = res.body;
      
      expect(created).toMatchObject({
        name: "Default Cat",
        color: "#0000FF",
        userId: aliceId,
      });
      expect(created.id).toBeDefined();

      // verify persisted in DB
      const dbCat = await prisma.category.findUnique({
        where: { id: created.id },
      });
      expect(dbCat).not.toBeNull();
      expect(dbCat?.color).toBe("#0000FF");
    });
  });

  describe("GET /api/categories/[id] (get single)", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: { id: streamingCatId } };
      
      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when category not found", async () => {
      jest.spyOn(prisma.category, "findFirst").mockResolvedValueOnce(null);
      
      const req = new Request(`http://localhost/api/categories/nonexistent`);
      const ctx = { params: { id: "nonexistent" } };
      
      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Not found" });
    });

    it("returns 500 on database error", async () => {
      jest
        .spyOn(prisma.category, "findFirst")
        .mockRejectedValueOnce(new Error("DB failure"));
      
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: { id: streamingCatId } };
      
      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch category" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch category" });
    });

    it("returns category for authorized user", async () => {
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: { id: streamingCatId } };
      
      const res = (await GET(req, ctx)) as unknown as ApiResponse<Category>;
      
      expect(res.body).toMatchObject({
        id: streamingCatId,
        userId: aliceId,
        name: "Streaming",
      });
    });
  });

  describe("PUT /api/categories/[id] (update)", () => {
    const updatedData = { name: "My Streaming Services", color: "#FFFFFF" };

    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 500 on database update failure", async () => {
      jest
        .spyOn(prisma.category, "update")
        .mockRejectedValueOnce(new Error("Update failure"));
      
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update category" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to update category" });
    });

    it("updates and returns the category", async () => {
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await PUT(req, ctx)) as unknown as ApiResponse<Category>;
      
      expect(res.body).toMatchObject({
        id: streamingCatId,
        userId: aliceId,
        ...updatedData,
      });
      
      // Confirm persisted in DB
      const dbCat = await prisma.category.findUnique({
        where: { id: streamingCatId },
      });
      expect(dbCat).toMatchObject(updatedData);
    });

    it("updates category with partial data (name only)", async () => {
      const partialUpdate = { name: "Updated Name Only" };
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await PUT(req, ctx)) as unknown as ApiResponse<Category>;
      
      expect(res.body).toMatchObject({
        id: streamingCatId,
        userId: aliceId,
        name: "Updated Name Only",
      });
      
      // Verify persisted
      const dbCat = await prisma.category.findUnique({
        where: { id: streamingCatId },
      });
      expect(dbCat?.name).toBe("Updated Name Only");
    });

    it("updates category with partial data (color only)", async () => {
      const partialUpdate = { color: "#FF0000" };
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await PUT(req, ctx)) as unknown as ApiResponse<Category>;
      
      expect(res.body).toMatchObject({
        id: streamingCatId,
        userId: aliceId,
        color: "#FF0000",
      });
      
      // Verify persisted
      const dbCat = await prisma.category.findUnique({
        where: { id: streamingCatId },
      });
      expect(dbCat?.color).toBe("#FF0000");
    });
  });

  describe("DELETE /api/categories/[id] (delete)", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 500 on database delete failure", async () => {
      jest
        .spyOn(prisma.category, "delete")
        .mockRejectedValueOnce(new Error("Delete failure"));
      
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete category" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to delete category" });
    });

    it("deletes category and returns success message", async () => {
      const req = new Request(`http://localhost/api/categories/${streamingCatId}`);
      const ctx = { params: Promise.resolve({ id: streamingCatId }) };
      
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ message: string }>;
      
      expect(res.body).toEqual({ message: "Category deleted successfully" });
      
      // Verify it's actually deleted
      const deleted = await prisma.category.findUnique({
        where: { id: streamingCatId },
      });
      expect(deleted).toBeNull();
    });
  });
});