'use client';

import { BookOpen, ChefHat, Home, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/library', label: 'Library', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-amber-800 font-semibold">
          <ChefHat className="w-6 h-6" />
          <span className="hidden sm:inline">Recipe Flow</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
