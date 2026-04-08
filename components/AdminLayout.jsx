import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const navItems = [
  { href: '/admin',            label: 'Fixtures',    icon: '📋' },
  { href: '/admin/load-games', label: 'Load Games',  icon: '⬇️' },
  { href: '/admin/umpires',    label: 'Umpires',     icon: '👤' },
  { href: '/admin/payments',   label: 'Payments',    icon: '💳' },
];

export default function AdminLayout({ children, title }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/admin/login');
      } else {
        setUser(data.session.user);
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/admin/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-brand-900 min-h-screen">
        <div className="px-4 py-5 border-b border-brand-700">
          <div className="text-white font-bold text-lg">🏏 Umpire Admin</div>
          <div className="text-brand-300 text-xs mt-0.5 truncate">{user?.email}</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 py-4 border-t border-brand-700 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-brand-300 hover:text-white hover:bg-brand-800">
            <span>🌐</span> Public View
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-brand-300 hover:text-white hover:bg-brand-800"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-brand-900 px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold">🏏 Umpire Admin</span>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-white p-1"
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <div className="md:hidden bg-brand-800 px-2 py-2 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-brand-200 hover:text-white hover:bg-brand-700"
              >
                {item.icon} {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-brand-300 hover:text-white hover:bg-brand-700 w-full">
              🚪 Sign Out
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-6 md:px-8 max-w-6xl w-full mx-auto">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
