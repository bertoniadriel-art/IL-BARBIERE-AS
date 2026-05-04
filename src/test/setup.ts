import '@testing-library/jest-dom';

// Mock next/navigation for tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => 
    `<img src="${src}" alt="${alt}" ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')} />`
}));

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerClient: () => ({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } })
      }
    }
  ),
  createBrowserClient: () => ({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
      }
    }
  )
}));