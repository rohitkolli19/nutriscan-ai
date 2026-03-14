import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../lib/api'

export default function SignupPage() {
  const navigate  = useNavigate()
  const signup    = useAuthStore(s => s.signup)
  const isLoading = useAuthStore(s => s.isLoading)

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())                       e.name    = 'Name is required'
    if (!email)                             e.email   = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email))  e.email   = 'Enter a valid email'
    if (!password)                          e.password = 'Password is required'
    else if (password.length < 8)           e.password = 'At least 8 characters'
    if (password !== confirm)               e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await signup(email, password, name)
      toast.success('Account created! Welcome to NutriScan AI.')
      navigate('/profile')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const passwordStrength = () => {
    if (password.length === 0) return null
    if (password.length < 6)  return { level: 1, label: 'Weak', color: 'bg-red-500' }
    if (password.length < 10) return { level: 2, label: 'Fair', color: 'bg-amber-500' }
    return { level: 3, label: 'Strong', color: 'bg-emerald-500' }
  }
  const strength = passwordStrength()

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="fixed inset-0 bg-grid opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center gap-4 mb-7">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500 blur-xl opacity-25 scale-110" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text tracking-tight">NutriScan AI</h1>
            <p className="text-slate-500 text-sm mt-1">Start your health journey today</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Create account</h2>
            <p className="text-slate-500 text-[13px] mt-1">Free forever · no credit card required</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              error={errors.name}
              icon={<User className="w-4 h-4" />}
              autoComplete="name"
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <div className="space-y-1.5">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="new-password"
                required
              />
              {strength && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength.level === 3 ? 'text-emerald-400' : strength.level === 2 ? 'text-amber-400' : 'text-red-400'}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              error={errors.confirm}
              icon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} className="mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-center text-[13px] text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
