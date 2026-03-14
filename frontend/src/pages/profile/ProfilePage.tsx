import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User, Activity, Heart, AlertCircle,
  Target, Save, Scale, Ruler, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import { profileService } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { HealthProfile } from '../../types'
import { extractError } from '../../lib/api'
import { clsx } from 'clsx'

const MEDICAL_CONDITIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'PCOS', 'Thyroid', 'Kidney Disease', 'Celiac Disease']
const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Fish']

function BMIGauge({ bmi }: { bmi: number }) {
  const category = bmi < 18.5 ? { label: 'Underweight', color: '#3b82f6' }
                 : bmi < 25   ? { label: 'Normal',       color: '#10b981' }
                 : bmi < 30   ? { label: 'Overweight',   color: '#f59e0b' }
                 : { label: 'Obese', color: '#ef4444' }

  const pct = Math.min(100, Math.max(0, ((bmi - 10) / 40) * 100))

  return (
    <Card className="text-center">
      <p className="text-sm text-slate-400 mb-3">BMI Score</p>
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={category.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.51} 251`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{bmi.toFixed(1)}</span>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: category.color }}>{category.label}</p>
    </Card>
  )
}

function CheckGroup({
  label, options, value, onChange
}: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (item: string) => {
    onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item])
  }
  return (
    <div>
      <p className="text-sm font-medium text-slate-300 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
              value.includes(opt)
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.get
  })

  const [form, setForm] = useState<Partial<HealthProfile>>({
    age: undefined,
    gender: undefined,
    height: undefined,
    weight: undefined,
    activity_level: 'moderately_active',
    medical_conditions: [],
    allergies: [],
    diet_goal: 'maintenance',
    daily_calorie_goal: undefined
  })

  useEffect(() => {
    if (data?.profile) {
      setForm({
        ...data.profile,
        medical_conditions: data.profile.medical_conditions || [],
        allergies: data.profile.allergies || []
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: profileService.save,
    onSuccess: () => {
      toast.success('Profile saved successfully!')
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['analytics-summary'] })
    },
    onError: (err) => toast.error(extractError(err))
  })

  const set = <K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  // Calculate live BMI
  const liveBMI = form.height && form.weight
    ? parseFloat((form.weight / ((form.height / 100) ** 2)).toFixed(1))
    : null

  // Calculate live TDEE estimate
  const liveTDEE = (() => {
    if (!form.age || !form.weight || !form.height || !form.gender || !form.activity_level) return null
    const bmr = form.gender === 'male'
      ? 10 * form.weight + 6.25 * form.height - 5 * form.age + 5
      : 10 * form.weight + 6.25 * form.height - 5 * form.age - 161
    const mult: Record<string, number> = {
      sedentary: 1.2, lightly_active: 1.375,
      moderately_active: 1.55, very_active: 1.725, extremely_active: 1.9
    }
    return Math.round(bmr * (mult[form.activity_level] || 1.55))
  })()

  if (isLoading) return <LoadingSpinner className="py-20" label="Loading profile…" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* User info header */}
      <Card className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-emerald-400 text-2xl font-bold">
            {data?.user?.name?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{data?.user?.name}</p>
          <p className="text-slate-400 text-sm">{data?.user?.email}</p>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Basic Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              placeholder="25"
              value={form.age || ''}
              onChange={e => set('age', parseInt(e.target.value) || undefined)}
              icon={<Calendar className="w-4 h-4" />}
              min={1} max={120}
            />
            <Select
              label="Gender"
              value={form.gender || ''}
              onChange={e => set('gender', e.target.value as HealthProfile['gender'])}
              options={[
                { value: '', label: 'Select gender' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ]}
            />
            <Input
              label="Height (cm)"
              type="number"
              placeholder="170"
              value={form.height || ''}
              onChange={e => set('height', parseFloat(e.target.value) || undefined)}
              icon={<Ruler className="w-4 h-4" />}
              min={50} max={300}
            />
            <Input
              label="Weight (kg)"
              type="number"
              placeholder="70"
              value={form.weight || ''}
              onChange={e => set('weight', parseFloat(e.target.value) || undefined)}
              icon={<Scale className="w-4 h-4" />}
              min={10} max={500}
            />
          </div>
        </Card>

        {/* BMI display */}
        {liveBMI && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-2 gap-4"
          >
            <BMIGauge bmi={liveBMI} />
            {liveTDEE && (
              <Card className="text-center">
                <p className="text-sm text-slate-400 mb-3">Daily Energy Need</p>
                <p className="text-3xl font-black text-white mt-6">{liveTDEE}</p>
                <p className="text-xs text-slate-400 mt-1">kcal / day (TDEE)</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* Activity & Goal */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Activity & Goal</h3>
          </div>
          <div className="space-y-4">
            <Select
              label="Activity Level"
              value={form.activity_level || 'moderately_active'}
              onChange={e => set('activity_level', e.target.value as HealthProfile['activity_level'])}
              options={[
                { value: 'sedentary',         label: 'Sedentary (desk job, no exercise)' },
                { value: 'lightly_active',    label: 'Lightly active (1-3 days/week)' },
                { value: 'moderately_active', label: 'Moderately active (3-5 days/week)' },
                { value: 'very_active',       label: 'Very active (6-7 days/week)' },
                { value: 'extremely_active',  label: 'Extremely active (athlete)' }
              ]}
            />
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Diet Goal</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'weight_loss',  label: 'Weight Loss',  emoji: '📉' },
                  { value: 'maintenance', label: 'Maintenance',  emoji: '⚖️' },
                  { value: 'muscle_gain', label: 'Muscle Gain',  emoji: '💪' }
                ].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => set('diet_goal', g.value as HealthProfile['diet_goal'])}
                    className={clsx(
                      'p-3 rounded-xl border text-center text-sm font-medium transition-all duration-200',
                      form.diet_goal === g.value
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xl block mb-1">{g.emoji}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Custom Daily Calorie Goal (optional)"
              type="number"
              placeholder={liveTDEE ? `${liveTDEE} (calculated)` : 'e.g. 2000'}
              value={form.daily_calorie_goal || ''}
              onChange={e => set('daily_calorie_goal', parseInt(e.target.value) || undefined)}
              icon={<Target className="w-4 h-4" />}
              hint="Leave blank to use your calculated TDEE"
            />
          </div>
        </Card>

        {/* Health Conditions */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Health Conditions</h3>
          </div>
          <CheckGroup
            label="Medical Conditions (select all that apply)"
            options={MEDICAL_CONDITIONS}
            value={form.medical_conditions || []}
            onChange={v => set('medical_conditions', v)}
          />
        </Card>

        {/* Allergies */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Food Allergies</h3>
          </div>
          <CheckGroup
            label="Allergies & Intolerances"
            options={ALLERGIES}
            value={form.allergies || []}
            onChange={v => set('allergies', v)}
          />
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={mutation.isPending}
          icon={<Save className="w-5 h-5" />}
        >
          Save Health Profile
        </Button>
      </form>
    </div>
  )
}
