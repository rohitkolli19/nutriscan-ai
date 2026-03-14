import { apiClient } from '../lib/api'
import type {
  HealthProfile,
  FoodScanResult,
  MenuScanResult,
  DailyAnalytics,
  WeeklyAnalytics,
  AnalyticsSummary,
  AIInsights,
  ActivityType
} from '../types'

// ─── Auth ────────────────────────────────────────────────────

export const authService = {
  signup: async (email: string, password: string, name: string) => {
    const res = await apiClient.post('/auth/signup', { email, password, name })
    return res.data as { user: { id: string; email: string; name: string }; accessToken: string }
  },

  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data as { user: { id: string; email: string; name: string }; accessToken: string }
  },

  logout: async () => {
    await apiClient.post('/auth/logout')
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me')
    return res.data.user
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email })
    return res.data
  }
}

// ─── Profile ─────────────────────────────────────────────────

export const profileService = {
  get: async (): Promise<{ profile: HealthProfile | null; user: { name: string; email: string } }> => {
    const res = await apiClient.get('/profile')
    return res.data
  },

  save: async (data: Partial<HealthProfile>) => {
    const res = await apiClient.post('/profile/save', data)
    return res.data
  }
}

// ─── Food Scan ───────────────────────────────────────────────

export const scanService = {
  scanFood: async (file: File): Promise<{ success: boolean; result: FoodScanResult; log_ids: string[] }> => {
    const formData = new FormData()
    formData.append('image', file)
    const res = await apiClient.post('/scan/food', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
    return res.data
  },

  scanFoodBase64: async (base64: string, mimeType = 'image/jpeg'): Promise<{ success: boolean; result: FoodScanResult; log_ids: string[] }> => {
    const res = await apiClient.post('/scan/food/base64', { image: base64, mimeType }, { timeout: 60000 })
    return res.data
  },

  getHistory: async (params?: { limit?: number; offset?: number; date?: string }) => {
    const res = await apiClient.get('/scan/history', { params })
    return res.data as { logs: import('../types').FoodLog[]; totals: import('../types').NutritionTotals; total_count: number }
  },

  deleteLog: async (id: string) => {
    const res = await apiClient.delete(`/scan/${id}`)
    return res.data
  }
}

// ─── Menu Scan ───────────────────────────────────────────────

export const menuService = {
  scanMenu: async (file: File, dietFilter?: string): Promise<{ success: boolean; result: MenuScanResult; scan_id: string }> => {
    const formData = new FormData()
    formData.append('image', file)  // backend: upload.single('image')
    if (dietFilter) formData.append('diet_preference', dietFilter)
    const res = await apiClient.post('/menu/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
    // Backend returns flat: { success, scan_id, menu_items, recommendations, ocr_confidence, total_items, restaurant_type }
    const d = res.data
    return {
      success: d.success,
      scan_id: d.scan_id,
      result: {
        restaurant_type: d.restaurant_type || 'Restaurant',
        menu_items: d.menu_items || [],
        recommended_dishes: d.recommendations || [],
        dishes_to_avoid: [],
        ocr_confidence: d.ocr_confidence || 0.8,
        total_items_found: d.total_items || (d.menu_items?.length ?? 0)
      }
    }
  },

  getHistory: async () => {
    const res = await apiClient.get('/menu/history')
    return res.data
  }
}

// ─── Analytics ───────────────────────────────────────────────

export const analyticsService = {
  getDaily: async (date?: string): Promise<DailyAnalytics> => {
    const res = await apiClient.get('/analytics/daily', { params: { date } })
    return res.data
  },

  getWeekly: async (endDate?: string): Promise<WeeklyAnalytics> => {
    const res = await apiClient.get('/analytics/weekly', { params: { end_date: endDate } })
    return res.data
  },

  getMonthly: async (year?: number, month?: number) => {
    const res = await apiClient.get('/analytics/monthly', { params: { year, month } })
    return res.data
  },

  getSummary: async (): Promise<AnalyticsSummary> => {
    const res = await apiClient.get('/analytics/summary')
    return res.data
  },

  getInsights: async (): Promise<AIInsights> => {
    const res = await apiClient.get('/analytics/insights')
    return res.data
  },

  logActivity: async (type: ActivityType, value: number, unit?: string, notes?: string) => {
    // Backend route: POST /api/analytics/log
    const res = await apiClient.post('/analytics/log', { type, value, unit, notes })
    return res.data
  }
}
