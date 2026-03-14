import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Camera, UtensilsCrossed,
  User, BarChart3, LogOut, Sparkles
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    color: 'emerald' },
  { to: '/scan/food', icon: Camera,           label: 'Food Scanner', color: 'blue' },
  { to: '/scan/menu', icon: UtensilsCrossed,  label: 'Menu Scanner', color: 'violet' },
  { to: '/analytics', icon: BarChart3,        label: 'Analytics',    color: 'amber' },
  { to: '/profile',   icon: User,             label: 'My Profile',   color: 'rose' },
]

const activeColors: Record<string, string> = {
  emerald: 'text-emerald-400 bg-emerald-500/12 border-emerald-500/25',
  blue:    'text-blue-400    bg-blue-500/12    border-blue-500/25',
  violet:  'text-violet-400  bg-violet-500/12  border-violet-500/25',
  amber:   'text-amber-400   bg-amber-500/12   border-amber-500/25',
  rose:    'text-rose-400    bg-rose-500/12    border-rose-500/25',
}

const iconColors: Record<string, string> = {
  emerald: 'text-emerald-400',
  blue:    'text-blue-400',
  violet:  'text-violet-400',
  amber:   'text-amber-400',
  rose:    'text-rose-400',
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-full border-r border-white/[0.06] bg-[#030712]/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-20 blur-sm" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
          </div>
          <div>
            <span className="font-bold text-white text-[15px] tracking-tight">NutriScan AI</span>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">DIETARY INTELLIGENCE</p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Navigation</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 border cursor-pointer',
                  isActive ? activeColors[color] : 'text-slate-500 border-transparent hover:text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.05]'
                )}
              >
                <Icon className={clsx('w-[18px] h-[18px] flex-shrink-0', isActive ? iconColors[color] : 'text-slate-600')} />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pro badge */}
      <div className="px-4 py-3">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/15 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">AI Powered</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">Gemini Vision + GPT-4 for ultra-accurate food analysis</p>
        </div>
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-1.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/30">
            <span className="text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-150 border border-transparent hover:border-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
