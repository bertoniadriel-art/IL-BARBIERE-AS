import { renderHook, waitFor } from '@testing-library/react';
/**
 * useConnectionStatus — unit tests
 * REQ-PR4.1: Connection status indicator shows real-time Supabase connection state
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

const mocks = vi.hoisted(() => {
  const mockOn = vi.fn().mockReturnThis();
  const mockSubscribe = vi.fn().mockImplementation((cb: any) => {
    if (typeof cb === 'function') cb('SUBSCRIBED');
    return { on: mockOn, subscribe: mockSubscribe };
  });
  const mockChannel = vi.fn().mockReturnValue({
    on: mockOn,
    subscribe: mockSubscribe,
  });
  const mockRemoveChannel = vi.fn();
  return { mockOn, mockSubscribe, mockChannel, mockRemoveChannel };
});

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    channel: (...args: any[]) => mocks.mockChannel(...args),
    removeChannel: (...args: any[]) => mocks.mockRemoveChannel(...args),
  },
}));

describe('useConnectionStatus (REQ-PR4.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns connected status after subscription', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    expect(result.current.lastSync).toBeInstanceOf(Date);
  });

  it('calls supabase.channel with correct channel name', () => {
    renderHook(() => useConnectionStatus());

    expect(mocks.mockChannel).toHaveBeenCalledWith('connection-monitor');
  });

  it('subscribes to channel', () => {
    renderHook(() => useConnectionStatus());

    expect(mocks.mockSubscribe).toHaveBeenCalled();
  });
});
