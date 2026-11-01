'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  FlaskConical,
  Newspaper,
  Shield,
  Settings,
  Bell,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: TrendingUp, label: 'Markets', path: '/markets' },
  { icon: Zap, label: 'Trade', path: '/trade' },
  { icon: FlaskConical, label: 'Paper', path: '/paper-trading' },
  { icon: Newspaper, label: 'News', path: '/news' },
  { icon: Shield, label: 'Safety', path: '/safety' },
]

const bottomItems = [
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Settings, label: 'Settings', path: '/profile' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, unreadNotifications } = useAppStore()

  return (
    <aside className="w-[72px] md:w-[220px] h-full bg-bg-secondary border-r border-bg-border flex flex-col shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-bg-border">
        <span className="text-lg font-semibold tracking-tight">
          AIVOLT<span className="text-red-500">.</span>
        </span>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path || pathname.startsWith(path + '/')
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="hidden md:block">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-bg-border p-2 space-y-1">
        {bottomItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => router.push(path)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm relative',
              pathname === path
                ? 'bg-white/10 text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            )}
          >
            <Icon size={18} />
            <span className="hidden md:block">{label}</span>
            {label === 'Alerts' && unreadNotifications > 0 && (
              <span className="ml-auto hidden md:flex w-5 h-5 rounded-full bg-red-500 text-[10px] items-center justify-center text-white">
                {unreadNotifications}
              </span>
            )}
          </button>
        ))}
        {user && (
          <div className="hidden md:block px-3 py-3 text-xs text-text-muted truncate">{user.name || user.email}</div>
        )}
      </div>
    </aside>
  )
}
