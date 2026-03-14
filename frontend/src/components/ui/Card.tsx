import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
  glow?: boolean
}

export const Card: React.FC<CardProps> = ({
  children, className, hover = false, onClick, padding = 'md', glow = false
}) => {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      onClick={onClick}
      className={clsx(
        'glass-card relative overflow-hidden',
        paddings[padding],
        hover && 'cursor-pointer',
        glow && 'glow-emerald-sm',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

const colorMap = {
  emerald: { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20' },
  blue:    { bg: 'bg-blue-500/12',    text: 'text-blue-400',    border: 'border-blue-500/20',    glow: 'shadow-blue-500/20' },
  amber:   { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/20',   glow: 'shadow-amber-500/20' },
  red:     { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/20',     glow: 'shadow-red-500/20' },
  purple:  { bg: 'bg-purple-500/12',  text: 'text-purple-400',  border: 'border-purple-500/20',  glow: 'shadow-purple-500/20' },
}

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, unit, icon, trend, trendValue, color = 'emerald', className
}) => {
  const c = colorMap[color]
  return (
    <Card className={clsx('flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between">
        <span className="text-[12px] text-slate-500 font-medium">{label}</span>
        {icon && (
          <div className={clsx('p-1.5 rounded-lg border shadow-sm', c.bg, c.border, c.glow)}>
            <span className={c.text}>{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {unit && <span className="text-[12px] text-slate-500 mb-0.5 font-medium">{unit}</span>}
      </div>
      {trend && trendValue && (
        <div className={clsx(
          'text-[11px] font-semibold flex items-center gap-1',
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
        </div>
      )}
    </Card>
  )
}
