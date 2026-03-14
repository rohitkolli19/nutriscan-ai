import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconRight,
  fullWidth = true,
  className,
  ...props
}, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-400 tracking-wide">
          {label}
          {props.required && <span className="text-emerald-500/80 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 focus:bg-white/[0.06]',
            'transition-all duration-150 text-[13.5px]',
            error
              ? 'border-red-500/50 focus:ring-red-500/30'
              : 'border-white/[0.08] hover:border-white/[0.14]',
            icon && 'pl-10',
            iconRight && 'pr-10',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
            {iconRight}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  fullWidth?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, fullWidth = true, className, ...props
}, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-400 tracking-wide">
          {label}
          {props.required && <span className="text-emerald-500/80 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
          'transition-all duration-150 text-[13.5px] appearance-none cursor-pointer',
          error
            ? 'border-red-500/50'
            : 'border-white/[0.08] hover:border-white/[0.14]',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">⚠ {error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
