import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Camera, UtensilsCrossed, Flame, Activity,
  TrendingUp, AlertTriangle, CheckCircle,
  Info, ChevronRight, Zap, Target, Droplets, Sparkles
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts'
import { analyticsService } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { Card, StatCard } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import type { AIInsight } from '../../types'
import { format } from 'date-fns'

const MACRO_COLORS = ['#10b981', '#3b82f6', '#f59e0b']

const insightIcon = (type: AIInsight['type']) => {
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16,1,0.3,1] } } }

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: analyticsService.getSummary,
    staleTime: 60_000
  })

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: analyticsService.getInsights,
    staleTime: 5 * 60_000
  })

  const { data: weekly } = useQuery({
    queryKey: ['weekly-analytics'],
    queryFn: () => analyticsService.getWeekly(),
    staleTime: 5 * 60_000
  })

  const today   = summary?.today
  const calPct  = Math.min(today?.calorie_pct ?? 0, 100)
  const toxRisk = today?.avg_toxicity_score ?? 0
  const toxColor = toxRisk <= 3 ? '#10b981' : toxRisk <= 6 ? '#f59e0b' : '#ef4444'
  const toxLabel = toxRisk <= 3 ? 'Low Risk' : toxRisk <= 6 ? 'Moderate' : 'High Risk'

  const macroPieData = today ? [
    { name: 'Protein', value: Math.max(today.protein_g, 0) },
    { name: 'Carbs',   value: Math.max(today.carbs_g,   0) },
    { name: 'Fat',     value: Math.max(today.fat_g,     0) },
  ] : []
  const hasMacros = macroPieData.some(d => d.value > 0)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

      {/* ── Greeting ──────────────────────────────── */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-[13px] font-medium mb-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h2>
          <p className="text-slate-500 text-[13px] mt-1">Here's your nutrition overview for today</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400">AI Active</span>
        </div>
      </motion.div>

      {/* ── Quick Actions ─────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <Link to="/scan/food">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card p-4 flex items-center gap-3.5 cursor-pointer group border-emerald-500/10 hover:border-emerald-500/25 transition-colors duration-200"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow flex-shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-white">Scan Food</p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI detection</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-emerald-400 transition-colors" />
          </motion.div>
        </Link>

        <Link to="/scan/menu">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card p-4 flex items-center gap-3.5 cursor-pointer group border-blue-500/10 hover:border-blue-500/25 transition-colors duration-200"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow flex-shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-white">Scan Menu</p>
              <p className="text-[11px] text-slate-500 mt-0.5">OCR + AI</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-blue-400 transition-colors" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Calorie Ring Card ─────────────────────── */}
      {loadingSummary ? (
        <SkeletonCard lines={4} />
      ) : (
        <motion.div variants={item}>
          <Card className="overflow-hidden">
            {/* Top gradient bar */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            <div className="flex items-center gap-6">
              {/* Circular progress */}
              <div className="relative flex-shrink-0">
                <svg width={90} height={90} viewBox="0 0 90 90" className="-rotate-90">
                  <circle cx={45} cy={45} r={38} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
                  <motion.circle
                    cx={45} cy={45} r={38}
                    fill="none"
                    stroke={calPct > 100 ? '#ef4444' : '#10b981'}
                    strokeWidth={7}
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - calPct / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white leading-none">{calPct}%</span>
                  <span className="text-[9px] text-slate-500 font-medium mt-0.5">goal</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-3xl font-bold text-white">{Math.round(today?.calories ?? 0)}</span>
                  <span className="text-slate-500 text-sm pb-0.5">/ {today?.calorie_goal ?? 2000} kcal</span>
                </div>
                <p className="text-[12px] text-slate-500 mb-3">{today?.calorie_remaining ?? 0} kcal remaining today</p>

                {/* Progress bar */}
                <div className="progress-bar mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${calPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={`progress-fill ${calPct > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{today?.meal_count ?? 0} meals logged</span>
                  {toxRisk > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: toxColor, background: `${toxColor}18` }}>
                      Risk: {toxRisk.toFixed(1)} · {toxLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Macro Stats Row ───────────────────────── */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Protein" value={Math.round(today?.protein_g ?? 0)} unit="g" color="emerald" icon={<Zap className="w-4 h-4" />} />
          <StatCard label="Carbs"   value={Math.round(today?.carbs_g   ?? 0)} unit="g" color="blue"    icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Fat"     value={Math.round(today?.fat_g     ?? 0)} unit="g" color="amber"   icon={<Flame className="w-4 h-4" />} />
          <StatCard label="Scans"   value={summary?.total_scans ?? 0}         color="purple"           icon={<TrendingUp className="w-4 h-4" />} />
        </motion.div>
      )}

      {/* ── Charts Row ───────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Macro donut */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-slate-200">Macro Distribution</p>
            <span className="badge bg-white/[0.05] text-slate-500 border border-white/[0.07]">Today</span>
          </div>
          {!hasMacros ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-slate-700" />
              </div>
              <p className="text-[12px] text-slate-600">No meals logged today</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={macroPieData} cx={50} cy={50} innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {macroPieData.map((_, i) => (
                      <Cell key={i} fill={MACRO_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`${Math.round(v)}g`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {macroPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: MACRO_COLORS[i] }} />
                      <span className="text-[12px] text-slate-400">{item.name}</span>
                    </div>
                    <span className="text-[12px] text-white font-semibold">{Math.round(item.value)}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 7-day bars */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-slate-200">7-Day Calories</p>
            {weekly && <span className="text-[11px] text-slate-500">Avg: {Math.round(weekly.avg_calories)} kcal</span>}
          </div>
          {weekly?.days ? (
            <div className="flex items-end gap-1.5 h-24">
              {weekly.days.map((day, i) => {
                const max    = Math.max(...weekly.days.map(d => d.calories), 1)
                const h      = day.calories > 0 ? Math.max(10, (day.calories / max) * 100) : 4
                const isToday = i === weekly.days.length - 1
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1 group">
                    <div className="relative flex-1 w-full flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                        className={`w-full rounded-t-md ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-white/[0.07] group-hover:bg-white/[0.12]'} transition-colors duration-150`}
                        style={{ minHeight: 4, boxShadow: isToday ? '0 0 10px rgba(16,185,129,0.3)' : '' }}
                      />
                    </div>
                    <span className={`text-[9px] font-medium ${isToday ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {format(new Date(day.date), 'EEE')}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-[12px] text-slate-600">
              No weekly data yet
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── AI Insights ───────────────────────────── */}
      <motion.div variants={item}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-200">AI Health Insights</p>
            </div>
            {insights?.overall_score !== undefined && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Target className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400">{insights.overall_score}/100</span>
              </div>
            )}
          </div>

          {loadingInsights ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(insights?.insights ?? []).slice(0, 4).map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.025] border border-white/[0.05] hover:border-white/[0.09] transition-colors duration-150"
                >
                  {insightIcon(insight.type)}
                  <p className="text-[12.5px] text-slate-300 leading-relaxed">{insight.message}</p>
                </motion.div>
              ))}
              {(!insights?.insights || insights.insights.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/[0.07] flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-6 h-6 text-slate-700" />
                  </div>
                  <p className="text-[13px] text-slate-500 font-medium">No insights yet</p>
                  <p className="text-[12px] text-slate-600 mt-1">Scan your first meal to get personalized AI insights</p>
                  <Link to="/scan/food">
                    <Button variant="outline" size="sm" className="mt-4">
                      Scan Food <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Profile completion nudge ──────────────── */}
      {summary && !summary.profile_complete && (
        <motion.div
          variants={item}
          className="glass-card p-4 border border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-transparent"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center">
                  <Target className="w-3 h-3 text-amber-400" />
                </div>
                <p className="text-[13px] font-semibold text-amber-300">Complete your health profile</p>
              </div>
              <p className="text-[11px] text-slate-500">Get personalized calorie goals & AI-powered recommendations</p>
            </div>
            <Link to="/profile" className="flex-shrink-0">
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 whitespace-nowrap">
                Set Up →
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
