import { useLocation } from 'react-router-dom'
import { Bell, Search, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const titles: Record<string, { label: string; subtitle: string }> = {
  '/dashboard': { label: 'Dashboard',     subtitle: 'Your nutrition overview' },
  '/scan/food': { label: 'Food Scanner',  subtitle: 'AI-powered food detection' },
  '/scan/menu': { label: 'Menu Scanner',  subtitle: 'OCR + AI recommendation' },
  '/analytics': { label: 'Analytics',    subtitle: 'Track your progress' },
  '/profile':   { label: 'Health Profile', subtitle: 'Manage your health data' },
}

export default function Header() {
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const info = titles[location.pathname] || { label: 'NutriScan AI', subtitle: '' }

  return (
    <header className="flex items-center justify-between px-5 md:px-7 h-[65px] border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl flex-shrink-0 sticky top-0 z-40">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="md:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/30">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-white leading-tight">{info.label}</h1>
          <p className="text-[11px] text-slate-500 hidden md:block">{info.subtitle}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search hint */}
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] transition-all duration-150 text-xs">
          <Search className="w-3.5 h-3.5" />
          <span>Search…</span>
          <kbd className="ml-1 text-[10px] bg-white/5 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>

        {/* Notification */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all duration-150 border border-transparent hover:border-white/[0.07]">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-2 ring-[#030712]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30 cursor-pointer hover:scale-105 transition-transform">
          <span className="text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </header>
  )
}
