import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Zap, Filter, Star, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { menuService } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { MenuScanResult, MenuItem } from '../../types'
import { extractError } from '../../lib/api'
import { clsx } from 'clsx'

const DIET_FILTERS = [
  { value: '', label: 'All Diets' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'high_protein', label: 'High Protein' },
  { value: 'low_carb', label: 'Low Carb' },
]

function HealthBar({ score }: { score: number }) {
  const color = score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-3 rounded-sm"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color }}>{score}/10</span>
    </div>
  )
}

function MenuItemCard({ item, isRecommended }: { item: MenuItem; isRecommended: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'glass p-4 rounded-xl border transition-colors duration-200',
        isRecommended ? 'border-emerald-500/30 bg-emerald-500/3' : 'border-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isRecommended && <Star className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
            <span className="text-sm font-semibold text-white truncate">{item.name}</span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {item.calories_estimate != null
              ? <><span className="text-lg font-bold text-white">{Math.round(item.calories_estimate)}</span><span className="text-xs text-slate-400">kcal</span></>
              : <span className="text-xs text-slate-500 italic">calories N/A</span>
            }
            {item.protein_g != null && (
              <><span className="text-xs text-slate-500">·</span><span className="text-xs text-slate-400">{Math.round(item.protein_g)}g protein</span></>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/5 space-y-3">
              {/* Macros */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Carbs', value: item.carbs_g },
                  { label: 'Fat',   value: item.fat_g },
                  { label: 'Fiber', value: item.fiber_g },
                ].map(m => (
                  <div key={m.label} className="text-center p-2 bg-white/3 rounded-xl">
                    <p className="text-sm font-bold text-white">{m.value != null ? `${Math.round(m.value)}g` : '—'}</p>
                    <p className="text-[10px] text-slate-500">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Health score */}
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Health Score</p>
                <HealthBar score={item.health_score} />
              </div>

              {/* Diet badges */}
              <div className="flex flex-wrap gap-1.5">
                {item.is_vegetarian && <span className="badge bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] px-2 py-0.5 rounded-full">Vegetarian</span>}
                {item.is_vegan && <span className="badge bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] px-2 py-0.5 rounded-full">Vegan</span>}
                {item.is_gluten_free && <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded-full">Gluten-Free</span>}
                {item.is_keto_friendly && <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-full">Keto</span>}
              </div>

              {/* Allergens */}
              {(item.allergens?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-slate-400">Contains: {item.allergens.join(', ')}</span>
                </div>
              )}

              {/* Why recommended */}
              {isRecommended && item.why_recommended && (
                <div className="flex items-start gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/15">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-300">{item.why_recommended}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function MenuResults({ result, dietFilter }: { result: MenuScanResult; dietFilter: string }) {
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended')
  const recommendedSet = new Set(result.recommended_dishes.map(d => d.toLowerCase()))
  const avoidSet = new Set((result.dishes_to_avoid || []).map(d => d.toLowerCase()))

  const filtered = activeTab === 'recommended'
    ? result.menu_items.filter(i => recommendedSet.has(i.name.toLowerCase()))
    : result.menu_items

  // Apply diet filter client-side — strict boolean check (AI always returns true/false)
  const display = dietFilter ? filtered.filter(item => {
    if (dietFilter === 'vegetarian')  return item.is_vegetarian === true || item.is_vegan === true
    if (dietFilter === 'vegan')       return item.is_vegan === true
    if (dietFilter === 'keto')        return item.is_keto_friendly === true || (item.carbs_g != null && item.carbs_g < 15)
    if (dietFilter === 'gluten_free') return item.is_gluten_free === true
    if (dietFilter === 'high_protein') return item.protein_g != null && item.protein_g >= 20
    if (dietFilter === 'low_carb')    return item.carbs_g != null && item.carbs_g <= 30
    return true
  }) : filtered

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-white capitalize">{result.restaurant_type} Restaurant</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {result.total_items_found} items found · OCR {Math.round(result.ocr_confidence * 100)}% accurate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">{result.recommended_dishes.length} recommended</span>
          </div>
        </div>
      </Card>

      {/* Dishes to avoid */}
      {result.dishes_to_avoid?.length > 0 && (
        <Card className="bg-red-500/3 border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1">Avoid (conflicts with your health profile)</p>
              <p className="text-xs text-slate-400">{result.dishes_to_avoid.join(', ')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl">
        {[
          { key: 'recommended', label: `Top Picks (${result.recommended_dishes.length})` },
          { key: 'all',         label: `All Items (${result.menu_items.length})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as 'recommended' | 'all')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              activeTab === t.key ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {display.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No items match this filter — try a different diet category or scan again with this filter selected
          </div>
        )}
        {display.map((item, i) => (
          <MenuItemCard
            key={i}
            item={item}
            isRecommended={recommendedSet.has(item.name.toLowerCase()) && !avoidSet.has(item.name.toLowerCase())}
          />
        ))}
      </div>
    </div>
  )
}

export default function MenuScannerPage() {
  const [preview, setPreview]       = useState<string | null>(null)
  const [file, setFile]             = useState<File | null>(null)
  const [scanning, setScanning]     = useState(false)
  const [result, setResult]         = useState<MenuScanResult | null>(null)
  const [dietFilter, setDietFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (f.size > 15 * 1024 * 1024)   { toast.error('Image too large (max 15MB)'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const res = await menuService.scanMenu(file, dietFilter || undefined)
      setResult(res.result)
      toast.success(`Found ${res.result.total_items_found} menu items!`)
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
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Info card */}
      <Card className="bg-blue-500/5 border-blue-500/20 p-4">
        <p className="text-sm text-blue-300 font-medium">How it works</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Upload a restaurant menu photo. Our AI will extract all dish names using OCR, estimate calories for each item, and recommend dishes based on your health profile.
        </p>
      </Card>

      {/* Diet filter */}
      <div>
        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter by diet preference
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIET_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDietFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                dietFilter === f.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload area */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="glass border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors duration-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Upload Menu Image</p>
            <p className="text-slate-400 text-sm mt-1">Drag & drop or click to browse</p>
            <p className="text-slate-500 text-xs mt-1">Supports restaurant menus, food boards, printed menus</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="Menu" className="w-full object-contain rounded-2xl max-h-80 bg-slate-900" />
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
              <p className="text-white font-medium">Reading menu with AI…</p>
              <p className="text-slate-400 text-sm mt-1">OCR extraction → NLP processing → Nutrition analysis</p>
            </Card>
          ) : (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleScan}
              icon={<Zap className="w-5 h-5" />}
            >
              Analyse Menu
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {dietFilter && (
              <div className="flex items-center justify-between bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <span className="text-xs text-emerald-300">
                  Filtering: <strong>{DIET_FILTERS.find(f => f.value === dietFilter)?.label}</strong>
                </span>
                <button
                  onClick={() => { setResult(null); }}
                  className="text-xs text-emerald-400 hover:text-emerald-200 font-medium"
                >
                  Re-scan with filter →
                </button>
              </div>
            )}
            <MenuResults result={result} dietFilter={dietFilter} />
            <Button variant="secondary" fullWidth onClick={reset}>
              Scan Another Menu
            </Button>
          </motion.div>
        </AnimatePresence>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />
    </div>
  )
}
