<template>
  <div class="calendar-container">
    <!-- Header -->
    <div class="calendar-header">
      <h1>Calendar Events</h1>
      <div class="header-actions">
        <Button
          @click="showCreateModal = true"
          icon="pi pi-plus"
          label="Create Event"
          size="large"
        />
        <Button
          @click="refreshEvents"
          icon="pi pi-refresh"
          :label="isLoading ? 'Loading...' : 'Refresh'"
          size="large"
          :loading="isLoading"
          severity="success"
        />
        <Button
          @click="logout"
          icon="pi pi-sign-out"
          label="Logout"
          size="large"
          severity="secondary"
        />
      </div>
    </div>

    <!-- Error Message -->
    <Message v-if="error" severity="error" :closable="true" @close="error = null">
      {{ error }}
    </Message>

    <!-- Loading Indicator -->
    <div v-if="isLoading && !events.length" class="loading-indicator">
      <i class="pi pi-spinner pi-spin" style="font-size: 2rem;"></i>
      <p>Loading calendar events...</p>
    </div>

    <!-- Calendar -->
    <Card class="calendar-wrapper">
      <template #content>
        <FullCalendar
          ref="calendar"
          :options="calendarOptions"
        />
      </template>
    </Card>

    <!-- Event Modal -->
    <EventModal
      v-if="showCreateModal || showEditModal"
      :event="selectedEvent || undefined"
      :initial-date="selectedDate || undefined"
      @close="closeModal"
      @save="handleEventSave"
    />

    <!-- Event Details Modal -->
    <Dialog
      v-model:visible="showEventDetails"
      :header="selectedEvent?.title || 'Event Details'"
      :modal="true"
      :closable="true"
      :draggable="false"
      style="width: 90%; max-width: 500px;"
    >
      <div class="event-details-content">
        <div v-if="selectedEvent?.description" class="detail-row">
          <label class="detail-label">Description:</label>
          <p class="detail-value">{{ selectedEvent.description }}</p>
        </div>
        
        <div v-if="selectedEvent?.location" class="detail-row">
          <label class="detail-label">Location:</label>
          <p class="detail-value">{{ selectedEvent.location }}</p>
        </div>
        
        <div class="detail-row">
          <label class="detail-label">Date & Time:</label>
          <p class="detail-value">
            {{ formatEventDate(selectedEvent?.startDate) }} - 
            {{ formatEventDate(selectedEvent?.endDate) }}
          </p>
        </div>
        
        <div class="detail-row">
          <label class="detail-label">Visibility:</label>
          <span class="visibility-badge" :class="`visibility-${selectedEvent?.visibility}`">
            {{ selectedEvent?.visibility?.toUpperCase() }}
          </span>
        </div>
        
        <div v-if="selectedEvent?.isRecurring" class="detail-row">
          <label class="detail-label">Recurring:</label>
          <p class="detail-value">{{ formatRecurrence(selectedEvent.recurrenceRule) }}</p>
        </div>
        
        <div v-if="selectedEvent?.reminders?.length" class="detail-row">
          <label class="detail-label">Reminders:</label>
          <ul class="detail-value">
            <li v-for="(reminder, index) in selectedEvent.reminders" :key="index">
              {{ formatReminder(reminder) }}
            </li>
          </ul>
        </div>
      </div>
      
      <template #footer>
        <div class="detail-actions">
          <Button
            @click="editEvent"
            icon="pi pi-pencil"
            label="Edit"
            severity="info"
          />
          <Button
            @click="confirmDeleteEvent"
            icon="pi pi-trash"
            label="Delete"
            severity="danger"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation -->
    <Dialog
      v-model:visible="showDeleteConfirm"
      header="Delete Event"
      :modal="true"
      :closable="true"
      :draggable="false"
      style="width: 90%; max-width: 400px;"
    >
      <div class="confirm-content">
        <i class="pi pi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
        <p>Are you sure you want to delete "{{ selectedEvent?.title }}"?</p>
      </div>
      
      <template #footer>
        <div class="confirm-actions">
          <Button
            @click="showDeleteConfirm = false"
            label="Cancel"
            severity="secondary"
          />
          <Button
            @click="deleteEvent"
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { calendarAPI, type CalendarEvent, type CreateEventData, type RecurrenceRule, type ApiReminder } from '@/services/api'
import EventModal from '@/components/EventModal.vue'

interface Emits {
  (e: 'logout'): void
}

const emit = defineEmits<Emits>()

const authStore = useAuthStore()

// Reactive state
const events = ref<CalendarEvent[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showEventDetails = ref(false)
const showDeleteConfirm = ref(false)
const selectedEvent = ref<CalendarEvent | null>(null)
const selectedDate = ref<Date | null>(null)
const calendar = ref()

// Calendar configuration
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  events: events.value.map((event, index) => ({
    id: `${event.id}-${index}`, // Make unique ID for each occurrence
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.allDay,
    backgroundColor: getEventColor(event.visibility),
    borderColor: getEventColor(event.visibility),
    extendedProps: {
      event: event
    }
  })),
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  editable: true,
  eventClick: handleEventClick,
  select: handleDateSelect,
  eventDrop: handleEventDrop,
  eventResize: handleEventResize,
  datesSet: handleDatesSet
}))

// Load events for date range
const loadEvents = async (start: Date, end: Date): Promise<void> => {
  isLoading.value = true
  error.value = null
  
  try {
    const response = await calendarAPI.getEvents({
      start: dayjs(start).toISOString(),
      end: dayjs(end).toISOString()
    })
    
    events.value = response.data.events
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load events'
    console.error('Error loading events:', err)
  } finally {
    isLoading.value = false
  }
}

// Event handlers
const handleDatesSet = (info: any): void => {
  loadEvents(info.start, info.end)
}

const handleDateSelect = (info: any): void => {
  selectedDate.value = info.start
  showCreateModal.value = true
  
  // Clear selection
  const calendarApi = calendar.value?.getApi()
  if (calendarApi) {
    calendarApi.unselect()
  }
}

const handleEventClick = (info: any): void => {
  selectedEvent.value = info.event.extendedProps.event
  showEventDetails.value = true
}

const handleEventDrop = async (info: any): Promise<void> => {
  const event = info.event.extendedProps.event
  
  try {
    await calendarAPI.updateEvent(event.id, {
      startDate: dayjs(info.event.start).toISOString(),
      endDate: dayjs(info.event.end || info.event.start).toISOString()
    })
    
    // Update local event
    const eventIndex = events.value.findIndex(e => e.id === event.id)
    if (eventIndex !== -1) {
      const foundEvent = events.value[eventIndex]
      if (foundEvent) {
        foundEvent.startDate = dayjs(info.event.start).toISOString()
        foundEvent.endDate = dayjs(info.event.end || info.event.start).toISOString()
      }
    }
  } catch (err: any) {
    console.log('Error updating event:', err)
    error.value = 'Failed to update event'
    info.revert()
  }
}

const handleEventResize = async (info: any): Promise<void> => {
  const event = info.event.extendedProps.event
  
  try {
    await calendarAPI.updateEvent(event.id, {
      startDate: dayjs(info.event.start).toISOString(),
      endDate: dayjs(info.event.end).toISOString()
    })
    
    // Update local event
    const eventIndex = events.value.findIndex(e => e.id === event.id)
    if (eventIndex !== -1) {
      const foundEvent = events.value[eventIndex]
      if (foundEvent) {
        foundEvent.startDate = dayjs(info.event.start).toISOString()
        foundEvent.endDate = dayjs(info.event.end).toISOString()
      }
    }
  } catch (err: any) {
    console.log('Error updating event:', err)
    error.value = 'Failed to update event'
    info.revert()
  }
}

const handleEventSave = async (eventData: CreateEventData): Promise<void> => {
  try {
    if (selectedEvent.value) {
      // Update existing event
      const response = await calendarAPI.updateEvent(selectedEvent.value.id, eventData)
      const eventIndex = events.value.findIndex(e => e.id === selectedEvent.value!.id)
      if (eventIndex !== -1) {
        events.value[eventIndex] = response.data
      }
    } else {
      // Create new event
      const response = await calendarAPI.createEvent(eventData)
      events.value.push(response.data)
    }
    
    closeModal()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to save event'
  }
}

const editEvent = (): void => {
  showEventDetails.value = false
  showEditModal.value = true
}

const confirmDeleteEvent = (): void => {
  showEventDetails.value = false
  showDeleteConfirm.value = true
}

const deleteEvent = async (): Promise<void> => {
  if (!selectedEvent.value) return
  
  try {
    await calendarAPI.deleteEvent(selectedEvent.value.id)
    events.value = events.value.filter(e => e.id !== selectedEvent.value!.id)
    showDeleteConfirm.value = false
    selectedEvent.value = null
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to delete event'
  }
}

const closeModal = (): void => {
  showCreateModal.value = false
  showEditModal.value = false
  selectedEvent.value = null
  selectedDate.value = null
}

watch(showEventDetails, (newValue) => {
  if (!newValue && !showEditModal.value) {
    selectedEvent.value = null
  }
})

const refreshEvents = (): void => {
  const calendarApi = calendar.value?.getApi()
  if (calendarApi) {
    const view = calendarApi.view
    loadEvents(view.currentStart, view.currentEnd)
  }
}

const logout = (): void => {
  authStore.logout()
  emit('logout')
}

// Utility functions
const getEventColor = (visibility: string): string => {
  switch (visibility) {
    case 'private':
      return '#dc3545'
    case 'public':
      return '#28a745'
    case 'team':
      return '#007bff'
    default:
      return '#6c757d'
  }
}

const formatEventDate = (dateString: string | undefined): string => {
  if (!dateString) return ''
  return dayjs(dateString).format('MMM D, YYYY h:mm A')
}

const formatRecurrence = (rule: RecurrenceRule | null | undefined): string => {
  if (!rule || !rule.frequency) return 'Not recurring'
  
  let text = `Every ${rule.interval > 1 ? rule.interval + ' ' : ''}${rule.frequency.toLowerCase()}`

  if (rule.byDay?.length) {
    const dayMap: { [key: string]: string } = {
      'MO': 'Monday',
      'TU': 'Tuesday', 
      'WE': 'Wednesday',
      'TH': 'Thursday',
      'FR': 'Friday',
      'SA': 'Saturday',
      'SU': 'Sunday'
    }
    
    const days = rule.byDay
      .map(day => dayMap[day] || day)
      .join(', ')
    text += ` on ${days}`
  }
  
  // Add end condition
  if (rule.endMode === 'on_date' && rule.endDate) {
    text += ` until ${dayjs(rule.endDate).format('MMM D, YYYY')}`
  } else if (rule.endMode === 'after_occurrences' && rule.occurrenceCount) {
    text += ` for ${rule.occurrenceCount} occurrences`
  }
  
  return text
}

const formatReminder = (reminder: ApiReminder): string => {
  const minutes = reminder.minutesBefore
  let time = ''
  
  if (minutes < 60) {
    time = `${minutes} minutes`
  } else if (minutes < 1440) {
    time = `${Math.floor(minutes / 60)} hours`
  } else {
    time = `${Math.floor(minutes / 1440)} days`
  }
  
  return `${time} before (${reminder.type})`
}

// Initialize
onMounted(() => {
  // Events will be loaded by handleDatesSet when calendar renders
})
</script>

<style scoped>
.calendar-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.calendar-header h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.loading-indicator {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.calendar-wrapper {
  margin-top: 1rem;
}

/* Event Details Content */
.event-details-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-label {
  font-weight: 600;
  color: #555;
  margin: 0;
}

.detail-value {
  margin: 0;
  color: #333;
  padding-left: 1rem;
}

.detail-value ul {
  margin: 0;
  padding-left: 2rem;
}

.visibility-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
}

.visibility-private {
  background: #f8d7da;
  color: #721c24;
}

.visibility-public {
  background: #d4edda;
  color: #155724;
}

.visibility-team {
  background: #cce7ff;
  color: #004085;
}

.detail-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.confirm-content {
  text-align: center;
  padding: 1rem;
}

.confirm-content p {
  margin: 1rem 0;
  font-size: 1.1rem;
}

.confirm-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Utility classes */
.text-warning {
  color: #f59e0b;
}

/* Minimal FullCalendar styling */
:deep(.fc) {
  font-family: inherit;
}

:deep(.fc-toolbar-title) {
  font-size: 1.5rem !important;
  font-weight: 600;
}

:deep(.fc-event) {
  border-radius: 4px !important;
  cursor: pointer;
}

:deep(.fc-daygrid-event) {
  margin: 1px 0 !important;
}

/* PrimeVue component adjustments */
:deep(.p-card-content) {
  padding: 1.5rem;
}

:deep(.p-dialog-footer) {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--p-content-border-color);
}
</style>