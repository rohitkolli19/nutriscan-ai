import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Upload, X, Zap, RefreshCw,
  CheckCircle, AlertTriangle, Info, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { scanService } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { FoodScanResult, FoodLog } from '../../types'
import { extractError } from '../../lib/api'
import { format } from 'date-fns'

type ViewMode = 'upload' | 'camera' | 'result' | 'history'

function ToxicityBadge({ score }: { score: number }) {
  const cls = score <= 3 ? 'risk-bg-low risk-low'
            : score <= 6 ? 'risk-bg-medium risk-medium'
            : 'risk-bg-high risk-high'
  const label = score <= 3 ? 'Low Risk' : score <= 6 ? 'Medium Risk' : 'High Risk'
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {score}/10 · {label}
    </span>
  )
}

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{Math.round(value)}g</span>
      </div>
      <div className="progress-bar">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="progress-fill"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

function ScanResult({ result, onReset }: { result: FoodScanResult; onReset: () => void }) {
  const total = result.total_nutrition
  const maxMacro = Math.max(total.protein_g, total.carbs_g, total.fat_g) || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">
            {result.foods[0]?.name ?? 'Unknown Food'}
            {result.foods.length > 1 && ` +${result.foods.length - 1} more`}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
              {result.cuisine}
            </span>
            <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full capitalize">
              {result.meal_type}
            </span>
            <span className="text-xs text-emerald-400">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <ToxicityBadge score={result.toxicity_score} />
      </div>

      {/* Calories */}
      <Card className="bg-emerald-500/5 border-emerald-500/20 text-center py-6">
        <p className="text-5xl font-black text-white">{Math.round(total.calories)}</p>
        <p className="text-slate-400 text-sm mt-1">kilocalories</p>
      </Card>

      {/* Macros */}
      <Card>
        <p className="text-sm font-semibold text-slate-300 mb-4">Macronutrients</p>
        <div className="space-y-3">
          <MacroBar label="Protein" value={total.protein_g} max={maxMacro} color="#10b981" />
          <MacroBar label="Carbohydrates" value={total.carbs_g} max={maxMacro} color="#3b82f6" />
          <MacroBar label="Fat" value={total.fat_g} max={maxMacro} color="#f59e0b" />
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
            {[
              { label: 'Fiber', value: total.fiber_g, unit: 'g' },
              { label: 'Sugar', value: total.sugar_g, unit: 'g' },
              { label: 'Sodium', value: total.sodium_mg, unit: 'mg' }
            ].map(m => (
              <div key={m.label} className="text-center p-2 bg-white/3 rounded-xl">
                <p className="text-white font-semibold text-sm">{Math.round(m.value)}{m.unit}</p>
                <p className="text-xs text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Toxicity reasons */}
      {result.toxicity_reasons.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-slate-300 mb-3">Toxicity Analysis</p>
          <div className="space-y-1.5">
            {result.toxicity_reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Health info */}
      {(result.health_benefits.length > 0 || result.health_warnings.length > 0) && (
        <Card>
          <p className="text-sm font-semibold text-slate-300 mb-3">Health Info</p>
          <div className="space-y-1.5">
            {result.health_benefits.slice(0, 3).map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                {b}
              </div>
            ))}
            {result.health_warnings.slice(0, 2).map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Recommendation */}
      {result.ai_recommendation && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300 leading-relaxed">{result.ai_recommendation}</p>
          </div>
        </Card>
      )}

      {/* Allergens */}
      {result.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-400">Allergens:</span>
          {result.allergens.map(a => (
            <span key={a} className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full capitalize">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Diet tags */}
      <div className="flex flex-wrap gap-1.5">
        {result.is_vegetarian && <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Vegetarian</span>}
        {result.is_vegan && <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Vegan</span>}
        {result.is_gluten_free && <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Gluten-Free</span>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" fullWidth onClick={onReset} icon={<RefreshCw className="w-4 h-4" />}>
          Scan Another
        </Button>
      </div>
    </motion.div>
  )
}

function HistoryList() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['scan-history'],
    queryFn: () => scanService.getHistory({ limit: 20 }),
    staleTime: 30_000
  })

  const handleDelete = async (id: string) => {
    try {
      await scanService.deleteLog(id)
      qc.invalidateQueries({ queryKey: ['scan-history'] })
      qc.invalidateQueries({ queryKey: ['analytics-summary'] })
      toast.success('Entry removed')
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  if (isLoading) return <LoadingSpinner className="py-12" label="Loading history…" />

  if (!data?.logs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Camera className="w-12 h-12 text-slate-700 mb-3" />
        <p className="text-slate-400 font-medium">No scans yet</p>
        <p className="text-slate-500 text-sm mt-1">Your food scan history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.logs.map((log: FoodLog) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{log.food_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {format(new Date(log.logged_at), 'MMM d · h:mm a')} · {log.meal_type}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-white">{Math.round(log.calories)} kcal</p>
            <p className="text-xs text-slate-500">{Math.round(log.protein_g)}g P · {Math.round(log.carbs_g)}g C</p>
          </div>
          <button
            onClick={() => handleDelete(log.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </div>
  )
}

export default function FoodScannerPage() {
  const [view, setView] = useState<ViewMode>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<FoodScanResult | null>(null)
  const [, setCameraActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const qc = useQueryClient()

  const handleFileSelect = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)')
      return
    }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    setResult(null)
    setView('upload')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const startCamera = async () => {
    try {
      // Try back camera first (mobile), fallback to any camera (laptop/desktop)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
      setView('camera')
    } catch {
      toast.error('Camera not available. Please upload an image instead.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
    setView('upload')
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const f = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      stopCamera()
      handleFileSelect(f)
    }, 'image/jpeg', 0.9)
  }

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const res = await scanService.scanFood(file)
      setResult(res.result)
      setView('result')
      qc.invalidateQueries({ queryKey: ['analytics-summary'] })
      qc.invalidateQueries({ queryKey: ['ai-insights'] })
      toast.success('Food analysed successfully!')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setScanning(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setView('upload')
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl">
        {(['upload', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize ${
              view === t || (view === 'result' && t === 'upload')
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'upload' ? 'Scan Food' : 'History'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Camera view */}
        {view === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <div className="corner-tl" />
                  <div className="corner-tr" />
                  <div className="corner-bl" />
                  <div className="corner-br" />
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/70 scan-line" />
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Button variant="primary" fullWidth size="lg" onClick={capturePhoto} icon={<Camera className="w-5 h-5" />}>
              Capture
            </Button>
          </motion.div>
        )}

        {/* Upload / Result view */}
        {(view === 'upload' || view === 'result') && (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Upload zone */}
            {!preview && !result && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="glass border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer transition-colors duration-200"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Drop food image here</p>
                  <p className="text-slate-400 text-sm mt-1">or click to browse · JPG, PNG, WebP up to 10MB</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); startCamera() }} icon={<Camera className="w-4 h-4" />}>
                    Camera
                  </Button>
                  <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>
                    Browse
                  </Button>
                </div>
              </div>
            )}

            {/* Preview + scan */}
            {preview && !result && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={preview} alt="Food" className="w-full object-cover rounded-2xl max-h-64" />
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {scanning ? (
                  <Card className="text-center py-8">
                    <LoadingSpinner size="lg" className="mx-auto mb-3" />
                    <p className="text-white font-medium">Analysing with AI…</p>
                    <p className="text-slate-400 text-sm mt-1">Detecting food · Estimating portions · Calculating nutrition</p>
                  </Card>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handleScan}
                    icon={<Zap className="w-5 h-5" />}
                  >
                    Analyse with AI
                  </Button>
                )}
              </div>
            )}

            {/* Scan result */}
            {result && <ScanResult result={result} onReset={reset} />}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </motion.div>
        )}

        {/* History view */}
        {view === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HistoryList />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
