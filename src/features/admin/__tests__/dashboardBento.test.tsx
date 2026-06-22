/**
 * DashboardBento — unit tests
 * TDD: T8.2 — Status update buttons with optimistic UI
 *
 * REQ-8.1: Admin dashboard provides UI control on each appointment entry
 * to update status to attended or confirmed, persisting to Supabase.
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();
  const mockChannel = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  });
  const mockRemoveChannel = vi.fn();
  return { mockUpdate, mockFrom, mockChannel, mockRemoveChannel };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mocks.mockFrom(...args),
    channel: (...args: any[]) => mocks.mockChannel(...args),
    removeChannel: (...args: any[]) => mocks.mockRemoveChannel(...args),
  },
}));

vi.mock("@/features/admin/services/appointmentService", () => ({
  updateAppointmentStatus: vi.fn(),
}));

import { DashboardBento } from "../components/DashboardBento";
import { updateAppointmentStatus } from "../services/appointmentService";

const mockUpdateAppointmentStatus = vi.mocked(updateAppointmentStatus);

function createChainableQuery(data: any[] = [], error: any = null) {
  const chain: any = {};
  const resolve = () => Promise.resolve({ data, error });

  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: any, onRejected: any) =>
    resolve().then(onFulfilled, onRejected);

  return chain;
}

describe("DashboardBento (T8.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Confirmar button for pending appointments", async () => {
    const chain = createChainableQuery([
      {
        id: "apt-1",
        status: "pending",
        deposit_paid: false,
        final_price: null,
        client_name: "Juan Perez",
        client_phone: "1234",
        appointment_date: "2026-06-10",
        appointment_time: "10:00",
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: "b1", name: "Test Barber" }} />);

    await waitFor(() => {
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
  });

  it("renders Presente button for confirmed appointments in pending deposits", async () => {
    const chain = createChainableQuery([
      {
        id: "apt-2",
        status: "confirmed",
        deposit_paid: false,
        final_price: 5000,
        client_name: "Maria Lopez",
        client_phone: "5678",
        appointment_date: "2026-06-10",
        appointment_time: "11:00",
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: "b1", name: "Test Barber" }} />);

    await waitFor(() => {
      expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /presente/i })).toBeInTheDocument();
  });

  it("calls updateAppointmentStatus with 'confirmed' when Confirmar clicked", async () => {
    mockUpdateAppointmentStatus.mockResolvedValue({ error: null });

    const chain = createChainableQuery([
      {
        id: "apt-1",
        status: "pending",
        deposit_paid: false,
        final_price: null,
        client_name: "Juan Perez",
        client_phone: "1234",
        appointment_date: "2026-06-10",
        appointment_time: "10:00",
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: "b1", name: "Test Barber" }} />);

    await waitFor(() => {
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(mockUpdateAppointmentStatus).toHaveBeenCalledWith("apt-1", "confirmed");
    });
  });

  it("calls updateAppointmentStatus with 'attended' when Presente clicked", async () => {
    mockUpdateAppointmentStatus.mockResolvedValue({ error: null });

    const chain = createChainableQuery([
      {
        id: "apt-2",
        status: "confirmed",
        deposit_paid: false,
        final_price: 5000,
        client_name: "Maria Lopez",
        client_phone: "5678",
        appointment_date: "2026-06-10",
        appointment_time: "11:00",
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: "b1", name: "Test Barber" }} />);

    await waitFor(() => {
      expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /presente/i }));

    await waitFor(() => {
      expect(mockUpdateAppointmentStatus).toHaveBeenCalledWith("apt-2", "attended");
    });
  });

  it("rolls back optimistic update on error", async () => {
    mockUpdateAppointmentStatus.mockResolvedValue({
      error: new Error("network fail"),
    });

    const chain = createChainableQuery([
      {
        id: "apt-1",
        status: "pending",
        deposit_paid: false,
        final_price: null,
        client_name: "Juan Perez",
        client_phone: "1234",
        appointment_date: "2026-06-10",
        appointment_time: "10:00",
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: "b1", name: "Test Barber" }} />);

    await waitFor(() => {
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    // After rollback, Confirmar button should reappear (status reverted to pending)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    });
  });
});
