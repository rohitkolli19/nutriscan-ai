import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../lib/api'

export default function LoginPage() {
  const navigate   = useNavigate()
  const login      = useAuthStore(s => s.login)
  const isLoading  = useAuthStore(s => s.isLoading)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!email)                            e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email'
    if (!password)                         e.password = 'Password is required'
    else if (password.length < 6)          e.password = 'At least 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="fixed inset-0 bg-grid opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-emerald-500 blur-xl opacity-25 scale-110" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </motion.div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text tracking-tight">NutriScan AI</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Dietary Intelligence Platform</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-7"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-500 text-[13px] mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={errors.password}
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-500 hover:text-slate-200 transition-colors" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} className="mt-1" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Sign In
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <Link to="/signup">
            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-300 text-sm font-medium hover:border-white/[0.14] hover:bg-white/[0.05] transition-all duration-150 cursor-pointer">
              Create a new account <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>
          </Link>
        </motion.div>

        <p className="text-center text-[11px] text-slate-700 mt-6">
          HCD Project · Srishti Manipal Institute of Art, Design and Technology
        </p>
      </motion.div>
    </div>
  )
}
