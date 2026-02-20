import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'

// API Base URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1.0'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'accept-language': 'en',
    'user-agent': 'vue-calendar-app/1.0.0'
  }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<LoginResponse>> =>
    apiClient.post('/login/brokers/email', credentials),
  
  refreshToken: (refreshToken: string): Promise<AxiosResponse<LoginResponse>> =>
    apiClient.post('/auth/refresh', { refreshToken })
}

// Calendar API
export const calendarAPI = {
  // List events
  getEvents: (params: GetEventsParams): Promise<AxiosResponse<EventsResponse>> =>
    apiClient.get('/calendar/events', { params }),
  
  // Create event
  createEvent: (event: CreateEventData): Promise<AxiosResponse<CalendarEvent>> =>
    apiClient.post('/calendar/events', event),
  
  // Update event
  updateEvent: (id: string, event: UpdateEventData): Promise<AxiosResponse<CalendarEvent>> =>
    apiClient.put(`/calendar/events/${id}`, event),
  
  // Delete event
  deleteEvent: (id: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/calendar/events/${id}`),
  
  // Get single event
  getEvent: (id: string): Promise<AxiosResponse<CalendarEvent>> =>
    apiClient.get(`/calendar/events/${id}`),
  
  // Get contacts for autocomplete
  getContacts: (query?: string): Promise<AxiosResponse<Contact[]>> =>
    apiClient.get('/calendar/contacts/autocomplete', { params: { query } })
}

// Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
}

export interface GetEventsParams {
  start: string  // ISO date string
  end: string    // ISO date string
}

export interface EventsResponse {
  events: CalendarEvent[]
  count: number
  range: {
    start: string
    end: string
  }
}

export interface LinkedContact {
  id: string
  fullName?: string
  firstName: string
  lastName: string
  email: string
}

export interface LinkedEstate {
  id: string
  type: string
}

export interface CalendarEvent {
  id: string
  title: string
  startDate: string  // ISO date string
  endDate: string    // ISO date string
  allDay?: boolean
  visibility: 'private' | 'public' | 'team'
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule | null
  description?: string | null
  location?: string | null
  participants: Participant[]
  reminders: ApiReminder[]
  linkedContacts: LinkedContact[]
  linkedEstates: LinkedEstate[]
  createdAt: string
  updatedAt: string
  isException: boolean
  exceptionType: string | null
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  byDay?: string[]  // ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  endMode: 'never' | 'on_date' | 'after_occurrences'
  endDate?: string
  occurrenceCount?: number
}

export interface Participant {
  id: string
  role: 'creator' | 'guest' | 'organizer'
  status: 'pending' | 'accepted' | 'declined'
  contact: Contact
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
}

export interface Reminder {
  id: string
  minutesBefore: number
  notificationType: 'email' | 'push' | 'both'
}

export interface ApiReminder {
  minutesBefore: number
  type: 'email' | 'push' | 'both'
  sent: boolean
}

export interface CreateEventData {
  title: string
  startDate: string
  endDate: string
  allDay?: boolean
  visibility: 'private' | 'public' | 'team'
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  description?: string
  location?: string
  participantIds?: string[]
  reminders?: Omit<Reminder, 'id'>[]
  contactIds?: string[]
  estateIds?: string[]
}

export type UpdateEventData = Partial<CreateEventData>

export default apiClient