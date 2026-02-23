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
    apiClient.post('/auth/refresh', { refreshToken }),

  getBrokerInfo: (): Promise<AxiosResponse<BrokerInfo>> =>
    apiClient.get('/brokers/me')
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
    apiClient.get('/calendar/contacts/autocomplete', { params: { query } }),

  // Search organization contacts for participants
  searchContacts: (organizationId: string, keyword: string, offset: number = 0, limit: number = 10): Promise<AxiosResponse<ContactSearchResponse>> =>
    apiClient.get(`/organizations/${organizationId}/contacts/search`, { 
      params: { offset, limit, keyword }
    }),

  // Search organization estates
  searchEstates: (organizationId: string, location: string, limit: number = 20): Promise<AxiosResponse<EstateSearchResponse>> =>
    apiClient.get(`/organizations/${organizationId}/estates`, {
      params: { limit, location }
    }),

  // Upload attachments to event
  uploadAttachments: (eventId: string, files: File[]): Promise<AxiosResponse<AttachmentUploadResponse>> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files[]', file)
    })
    return apiClient.post(`/calendar/events/${eventId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Delete attachment from event
  deleteAttachment: (eventId: string, attachmentId: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/calendar/events/${eventId}/attachments/${attachmentId}`)
  ,

  // Comments
  listComments: (eventId: string): Promise<AxiosResponse<ListCommentsResponse>> =>
    apiClient.get(`/calendar/events/${eventId}/comments`),

  addComment: (eventId: string, payload: AddCommentDto): Promise<AxiosResponse<EventComment>> =>
    apiClient.post(`/calendar/events/${eventId}/comments`, payload),

  updateComment: (eventId: string, commentId: string, payload: UpdateCommentDto): Promise<AxiosResponse<EventComment>> =>
    apiClient.put(`/calendar/events/${eventId}/comments/${commentId}`, payload),

  deleteComment: (eventId: string, commentId: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/calendar/events/${eventId}/comments/${commentId}`)
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

export interface BrokerInfo {
  id: string
  editVersion: number
  userType: string
  profilePhoto: string
  userIdentifier: string
  userTypeIdentifier: string
  firstName: string
  lastName: string
  email: string
  emailConfirmed: boolean
  timezone: string | null
  deleted: boolean
  linkedAccounts: any[]
  organization: {
    id: string
    name: string
    coordinates: {
      lat: number
      lon: number
    }
    bookedTools: {
      emailMarketing: boolean
      valuationTool: boolean
      socialQ: boolean
      marktMonitor: boolean
      contactQ: boolean
      objectQ: boolean
    }
    subscriptionPlan: any
  }
  isAdmin: boolean
}

export interface ContactSearchResult {
  id: string
  editVersion: number
  isCompany: boolean
  salutation: string | null
  ownFullSalutation: string | null
  academicTitle: string | null
  firstName: string | null
  lastName: string | null
  full_name: string
  email: string
  [key: string]: any
}

export interface ContactSearchResponse {
  results: ContactSearchResult[]
  totalCount?: number
}

export interface EstateLocation {
  country: string
  city: string
  street: string
  houseNumber: string
  postalCode: string
  coordinate: {
    longitude: number
    latitude: number
  }
  district: string
}

export interface EstateSearchResult {
  id: string
  location: EstateLocation
  [key: string]: any
}

export interface EstateSearchResponse {
  results: EstateSearchResult[]
  totalCount?: number
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
  location: {
    country: string
    city: string
    street: string
    houseNumber: string
    postalCode: string
    district: string
  }
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
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
  isException: boolean
  exceptionType: string | null
  category: string | null
  color: string | null
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
  id?: string
  contactId?: string
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
  participants?: Array<{contactId: string, role: 'creator' | 'organizer' | 'guest'}>
  participantIds?: string[]
  reminders?: Omit<Reminder, 'id'>[]
  contactIds?: string[]
  estateIds?: string[]
  linkedContactIds?: string[]
  linkedEstateIds?: string[]
}

export type UpdateEventData = Partial<CreateEventData>

export interface Attachment {
  id: string
  filename: string
  size: number
  mimeType?: string
  url: string
}

export interface AttachmentUploadResponse {
  attachments: Attachment[]
}

export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ],
  videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm']
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function getFileIcon(mimeType: string): string {
  if (SUPPORTED_FILE_TYPES.images.includes(mimeType)) {
    return 'pi pi-image'
  }
  if (mimeType === 'application/pdf') {
    return 'pi pi-file-pdf'
  }
  if (SUPPORTED_FILE_TYPES.documents.includes(mimeType)) {
    return 'pi pi-file'
  }
  if (SUPPORTED_FILE_TYPES.videos.includes(mimeType)) {
    return 'pi pi-video'
  }
  return 'pi pi-file'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default apiClient

// Comment types
export interface EventCommentUser {
  id: string
  name: string
}

export interface EventComment {
  id: string
  comment: string
  createdAt: string
  updatedAt: string
  createdBy?: EventCommentUser | null
  updatedBy?: EventCommentUser | null
}

export interface ListCommentsResponse {
  comments: EventComment[]
}

export interface AddCommentDto {
  comment: string
}

export interface UpdateCommentDto {
  comment: string
}