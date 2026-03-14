import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Droplets, Dumbbell, TrendingUp, Plus,
  CheckCircle, AlertTriangle, Info, Flame
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyticsService } from '../../services/api'
import { Card, StatCard } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { AIInsight } from '../../types'
import { extractError } from '../../lib/api'
import { format, subDays } from 'date-fns'
import { clsx } from 'clsx'

const MACRO_COLORS = ['#10b981', '#3b82f6', '#f59e0b']

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 12
  }
}

function insightIcon(type: AIInsight['type']) {
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
}

function LogActivity() {
  const qc = useQueryClient()
  const [type, setType] = useState<'water' | 'exercise' | 'weight'>('water')
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => analyticsService.logActivity(type, parseFloat(value)),
    onSuccess: () => {
      toast.success('Activity logged!')
      setValue('')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['daily-analytics'] })
      qc.invalidateQueries({ queryKey: ['weekly-analytics'] })
    },
    onError: (err) => toast.error(extractError(err))
  })

  const configs = {
    water:    { label: 'Water', unit: 'ml', placeholder: '250', icon: <Droplets className="w-4 h-4" />, color: 'text-blue-400' },
    exercise: { label: 'Exercise', unit: 'minutes', placeholder: '30', icon: <Dumbbell className="w-4 h-4" />, color: 'text-emerald-400' },
    weight:   { label: 'Weight', unit: 'kg', placeholder: '70', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-400' }
  }
  const cfg = configs[type]

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Log Activity
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl border border-white/8 mt-3 space-y-3"
        >
          <div className="flex gap-1">
            {(Object.keys(configs) as (keyof typeof configs)[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 capitalize ${
                  type === t ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={`${cfg.placeholder} ${cfg.unit}`}
              value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!value || parseFloat(value) <= 0}
            >
              Log
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().split('T')[0]

  const { data: daily, isLoading: loadingDaily } = useQuery({
    queryKey: ['daily-analytics', today],
    queryFn: () => analyticsService.getDaily(today),
    staleTime: 60_000
  })

  const { data: weekly, isLoading: loadingWeekly } = useQuery({
    queryKey: ['weekly-analytics'],
    queryFn: () => analyticsService.getWeekly(),
    staleTime: 5 * 60_000
  })

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: analyticsService.getInsights,
    staleTime: 10 * 60_000
  })

  // Format weekly data for charts
  const weeklyChartData = weekly?.days.map(d => ({
    day: format(new Date(d.date), 'EEE'),
    calories: Math.round(d.calories),
    protein: Math.round(d.protein_g),
    carbs: Math.round(d.carbs_g),
    fat: Math.round(d.fat_g),
    water: Math.round(d.water_ml / 1000 * 10) / 10,
    exercise: d.exercise_min
  })) || []

  const macroPie = daily ? [
    { name: 'Protein', value: Math.round(daily.totals.protein_g) },
    { name: 'Carbs',   value: Math.round(daily.totals.carbs_g) },
    { name: 'Fat',     value: Math.round(daily.totals.fat_g) }
  ] : []

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Today summary row */}
      {loadingDaily ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="glass h-24 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Calories Today"
            value={Math.round(daily?.totals.calories ?? 0)}
            unit="kcal"
            color="emerald"
            icon={<Flame className="w-4 h-4" />}
            trend={daily && daily.totals.calories > 0 ? 'up' : 'neutral'}
            trendValue={daily ? `${daily.calorie_pct}% of goal` : ''}
          />
          <StatCard
            label="Protein"
            value={Math.round(daily?.totals.protein_g ?? 0)}
            unit="g"
            color="blue"
            icon={<Dumbbell className="w-4 h-4" />}
          />
          <StatCard
            label="Water"
            value={((daily?.water_ml ?? 0) / 1000).toFixed(1)}
            unit="L"
            color="purple"
            icon={<Droplets className="w-4 h-4" />}
          />
          <StatCard
            label="Exercise"
            value={daily?.exercise_min ?? 0}
            unit="min"
            color="amber"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Log Activity */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-300">Today's Activity</p>
          <LogActivity />
        </div>
        <div className="flex items-center gap-4 mt-3">
          {[
            { label: 'Water', value: `${((daily?.water_ml ?? 0) / 1000).toFixed(1)} L`, color: 'text-blue-400', icon: <Droplets className="w-4 h-4" /> },
            { label: 'Exercise', value: `${daily?.exercise_min ?? 0} min`, color: 'text-emerald-400', icon: <Dumbbell className="w-4 h-4" /> }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={item.color}>{item.icon}</span>
              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Calorie progress */}
      {daily && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-300">Calorie Goal</p>
            <p className="text-xs text-slate-400">{Math.round(daily.totals.calories)} / {daily.calorie_goal} kcal</p>
          </div>
          <div className="progress-bar mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, daily.calorie_pct)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`progress-fill ${daily.calorie_pct > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
            />
          </div>
          <p className="text-xs text-slate-400">
            {daily.calorie_pct < 100
              ? `${daily.calorie_remaining} kcal remaining`
              : `${Math.round(daily.totals.calories - daily.calorie_goal)} kcal over goal`}
          </p>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Macro pie */}
        <Card>
          <p className="text-sm font-semibold text-slate-300 mb-4">Today's Macros</p>
          {macroPie.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              No food logged today
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={macroPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {macroPie.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}g`]} />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Weekly calories */}
        <Card>
          <p className="text-sm font-semibold text-slate-300 mb-4">Weekly Calories</p>
          {loadingWeekly ? (
            <LoadingSpinner className="h-40" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyChartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v} kcal`]} />
                <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Weekly macros stacked */}
      <Card>
        <p className="text-sm font-semibold text-slate-300 mb-4">Weekly Macro Breakdown</p>
        {loadingWeekly ? (
          <LoadingSpinner className="h-48" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyChartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}g`]} />
              <Legend formatter={(value) => <span className="text-xs text-slate-400 capitalize">{value}</span>} />
              <Bar dataKey="protein" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="carbs"   stackId="a" fill="#3b82f6" />
              <Bar dataKey="fat"     stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Weekly water trend */}
      {weeklyChartData.some(d => d.water > 0) && (
        <Card>
          <p className="text-sm font-semibold text-slate-300 mb-4">Weekly Water Intake (L)</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v} L`]} />
              <Line
                type="monotone" dataKey="water" stroke="#3b82f6"
                strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* AI Insights */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-300">AI Health Insights</p>
          {insights?.overall_score !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">{insights.overall_score}</span>
              </div>
              <span className="text-xs text-slate-400">health score</span>
            </div>
          )}
        </div>

        {loadingInsights ? (
          <LoadingSpinner className="py-6" />
        ) : (
          <div className="space-y-2">
            {(insights?.insights ?? []).map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl border text-sm',
                  ins.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20'
                    : ins.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                )}
              >
                {insightIcon(ins.type)}
                <p className="text-slate-300 leading-relaxed">{ins.message}</p>
              </motion.div>
            ))}

            {insights?.nutrient_gaps && insights.nutrient_gaps.length > 0 && (
              <div className="mt-3 p-3 bg-white/3 rounded-xl">
                <p className="text-xs text-slate-400 mb-2">Nutrient gaps to address:</p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.nutrient_gaps.map(g => (
                    <span key={g} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full capitalize">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {insights?.recommended_foods && insights.recommended_foods.length > 0 && (
              <div className="mt-2 p-3 bg-white/3 rounded-xl">
                <p className="text-xs text-slate-400 mb-2">Recommended foods:</p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.recommended_foods.map(f => (
                    <span key={f} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full capitalize">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!insights?.insights || insights.insights.length === 0) && (
              <div className="text-center py-6 text-slate-500 text-sm">
                Log more meals to get AI insights
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Weekly stats summary */}
      {weekly && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-xs text-slate-400 mb-1">Avg Daily</p>
            <p className="text-xl font-bold text-white">{weekly.avg_calories}</p>
            <p className="text-xs text-slate-500">kcal</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-slate-400 mb-1">Total Exercise</p>
            <p className="text-xl font-bold text-emerald-400">{weekly.total_exercise_min}</p>
            <p className="text-xs text-slate-500">min</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-slate-400 mb-1">Total Water</p>
            <p className="text-xl font-bold text-blue-400">{(weekly.total_water_ml / 1000).toFixed(1)}</p>
            <p className="text-xs text-slate-500">litres</p>
          </Card>
        </div>
      )}
    </div>
  )
}
