/**
 * authService — unit tests
 * TDD: T5.3 — authService uses supabase-client.ts, not the old supabase.ts.
 * No hardcoded UUID or plaintext password comparison.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so variables are available at mock hoisting time
const mocks = vi.hoisted(() => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetSession = vi.fn();
  const mockFrom = vi.fn();
  return { mockSignIn, mockSignOut, mockGetSession, mockFrom };
});

vi.mock("@/shared/lib/supabase-client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.mockSignIn,
      signOut: mocks.mockSignOut,
      getSession: mocks.mockGetSession,
    },
    from: mocks.mockFrom,
  },
}));

// Import AFTER mock registration
import { authService } from "@/features/auth/services/authService";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls supabase.auth.signInWithPassword with email and password", async () => {
      mocks.mockSignIn.mockResolvedValueOnce({
        data: { user: { id: "auth-user-1", email: "santi@test.com" }, session: {} },
        error: null,
      });

      const result = await authService.signIn("santi@test.com", "somepassword");

      expect(mocks.mockSignIn).toHaveBeenCalledOnce();
      expect(mocks.mockSignIn).toHaveBeenCalledWith({
        email: "santi@test.com",
        password: "somepassword",
      });
      expect(result.error).toBeNull();
      expect(result.data?.user?.id).toBe("auth-user-1");
    });

    it("returns error when signIn fails", async () => {
      mocks.mockSignIn.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid login credentials" },
      });

      const result = await authService.signIn("bad@email.com", "wrong");

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe("signOut", () => {
    it("calls supabase.auth.signOut", async () => {
      mocks.mockSignOut.mockResolvedValueOnce({ error: null });

      const result = await authService.signOut();

      expect(mocks.mockSignOut).toHaveBeenCalledOnce();
      expect(result.error).toBeNull();
    });
  });

  describe("getSession", () => {
    it("returns session when available", async () => {
      const fakeSession = { user: { id: "auth-user-1" }, access_token: "tok" };
      mocks.mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });

      const session = await authService.getSession();

      expect(session).toEqual(fakeSession);
    });

    it("returns null when no session", async () => {
      mocks.mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      const session = await authService.getSession();

      expect(session).toBeNull();
    });
  });

  describe("getCurrentBarber", () => {
    it("returns barber matched by auth_user_id from session", async () => {
      const fakeSession = { user: { id: "4c940e20-e080-47a8-bb4d-dbfaef0e093b" }, access_token: "tok" };
      mocks.mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: "barber-santi", name: "Santi Ducca", auth_user_id: fakeSession.user.id },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mocks.mockFrom.mockReturnValue({ select: mockSelect });

      const barber = await authService.getCurrentBarber();

      expect(barber).not.toBeNull();
      expect(barber?.name).toBe("Santi Ducca");
      expect(mocks.mockFrom).toHaveBeenCalledWith("barbers");
    });

    it("returns null when no session", async () => {
      mocks.mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      const barber = await authService.getCurrentBarber();

      expect(barber).toBeNull();
      expect(mocks.mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("REQ-5.1 — no plaintext comparison or hardcoded UUID", () => {
    it("authService module source does not contain hardcoded UUIDs", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const src = fs.readFileSync(
        path.resolve(process.cwd(), "src/features/auth/services/authService.ts"),
        "utf-8"
      );
      expect(src).not.toContain("78c41016");
      expect(src).not.toContain("065f5bb5");
      expect(src).not.toContain("santi123");
      expect(src).not.toContain("fede123");
    });
  });
});
