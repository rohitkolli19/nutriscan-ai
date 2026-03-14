import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Camera, UtensilsCrossed, User, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home',    color: '#10b981' },
  { to: '/scan/food', icon: Camera,           label: 'Scan',    color: '#60a5fa' },
  { to: '/scan/menu', icon: UtensilsCrossed,  label: 'Menu',    color: '#a78bfa' },
  { to: '/analytics', icon: BarChart3,        label: 'Stats',   color: '#fbbf24' },
  { to: '/profile',   icon: User,             label: 'Profile', color: '#f87171' },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-[#030712]/95 backdrop-blur-2xl border-t border-white/[0.07] px-1 pt-2 pb-3 flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'} className="flex-1">
            {({ isActive }) => (
              <div className={clsx(
                'flex flex-col items-center gap-1 py-1.5 rounded-xl mx-0.5 transition-all duration-200',
                isActive ? 'bg-white/[0.05]' : ''
              )}>
                <div className={clsx(
                  'p-1.5 rounded-lg transition-all duration-200',
                )}>
                  <Icon
                    className="w-[19px] h-[19px] transition-colors duration-200"
                    style={{ color: isActive ? color : '#475569' }}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className="text-[9.5px] font-semibold transition-colors duration-200"
                  style={{ color: isActive ? color : '#475569' }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
