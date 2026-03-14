import React from 'react'
import { clsx } from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10', xl: 'w-16 h-16' }

export const LoadingSpinner: React.FC<Props> = ({ size = 'md', className, label }) => (
  <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
    <div className={clsx(sizes[size], 'relative')}>
      <div className={clsx(sizes[size], 'rounded-full border-2 border-white/10 absolute')} />
      <div className={clsx(sizes[size], 'rounded-full border-2 border-transparent border-t-emerald-500 animate-spin absolute')} />
    </div>
    {label && <span className="text-sm text-slate-400">{label}</span>}
  </div>
)

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-full border-2 border-white/5 absolute" />
        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin absolute" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-emerald-400 text-xl">🌿</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium">{label}</p>
    </div>
  </div>
)

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="glass p-5 space-y-3">
    <div className="skeleton h-4 w-2/3" />
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <div key={i} className={clsx('skeleton h-3', i % 2 === 0 ? 'w-full' : 'w-4/5')} />
    ))}
  </div>
)
