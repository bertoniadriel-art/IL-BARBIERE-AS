/**
 * LoginForm — unit tests
 * TDD: T5.4 — LoginForm calls router.refresh() after successful login
 * so the server component admin page re-renders with the new session.
 *
 * REQ-5.1: no hardcoded UUID or plaintext comparison in LoginForm.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks hoisted
const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockSignIn = vi.fn();
  const mockFrom = vi.fn();
  return { mockPush, mockRefresh, mockSignIn, mockFrom };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.mockPush,
    replace: vi.fn(),
    refresh: mocks.mockRefresh,
    back: vi.fn(),
  }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.mockSignIn,
    },
    from: mocks.mockFrom,
  },
}));

vi.mock('@/features/auth/services/authService', () => ({
  authService: {
    signIn: mocks.mockSignIn,
    signOut: vi.fn(),
    getSession: vi.fn().mockResolvedValue(null),
    getCurrentBarber: vi.fn().mockResolvedValue(null),
  },
}));

import { LoginForm } from '@/features/admin/components/LoginForm';

describe('LoginForm (T5.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls router.refresh() after successful login', async () => {
    const fakeBarber = { id: 'barber-santi', name: 'Santi Ducca', auth_user_id: '4c940e20' };
    mocks.mockSignIn.mockResolvedValueOnce({
      data: { user: { id: '4c940e20', email: 'santi@test.com' }, session: {} },
      error: null,
    });
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: fakeBarber, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mocks.mockFrom.mockReturnValue({ select: mockSelect });

    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'santi@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }));

    await waitFor(() => {
      expect(mocks.mockRefresh).toHaveBeenCalledOnce();
    });
  });

  it('does NOT call router.refresh() on failed login', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
    expect(mocks.mockRefresh).not.toHaveBeenCalled();
  });

  it('shows inline error for wrong credentials', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
  });

  it('REQ-5.1 — no hardcoded UUID in LoginForm source', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/admin/components/LoginForm.tsx'),
      'utf-8'
    );
    expect(src).not.toContain('78c41016');
    expect(src).not.toContain('065f5bb5');
    expect(src).not.toContain('santi123');
    expect(src).not.toContain('fede123');
  });
});
