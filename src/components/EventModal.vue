<template>
  <Dialog 
    v-model:visible="isVisible" 
    :header="isEditing ? 'Edit Event' : 'Create Event'"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="event-modal"
    style="width: 90%; max-width: 600px;"
    @hide="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="event-form p-4">
      <!-- Basic Info -->
      <div class="form-group">
        <FloatLabel>
          <InputText
            id="title"
            v-model="eventData.title"
            required
            class="w-full"
          />
          <label for="title">Title *</label>
        </FloatLabel>
      </div>

      <div class="form-group">
        <FloatLabel>
          <Textarea
            id="description"
            v-model="eventData.description"
            class="w-full"
            rows="3"
          />
          <label for="description">Description</label>
        </FloatLabel>
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="location"
            v-model="eventData.location"
            class="w-full"
          />
          <label for="location">Location</label>
        </FloatLabel>
      </div>

      <!-- Category -->
      <div class="form-group">
        <FloatLabel>
          <Dropdown
            id="category"
            v-model="eventData.category"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
          <label for="category">Category</label>
        </FloatLabel>
      </div>

      <!-- Color -->
      <div class="form-group">
        <label for="color" class="block mb-2">Event Color</label>
        <div class="color-picker-wrapper">
          <ColorPicker
            id="color"
            v-model="eventData.color"
            format="hex"
            class="color-picker"
          />
          <InputText
            v-model="eventData.color"
            placeholder="#10b981"
            class="color-input"
          />
        </div>
      </div>

      <!-- Date & Time -->
      <div class="form-row">
        <div class="form-group">
          <FloatLabel>
            <Calendar
              id="start-date"
              v-model="startDateCalendar"
              showTime
              hourFormat="12"
              required
              class="w-full"
            />
            <label for="start-date">Start Date *</label>
          </FloatLabel>
        </div>

        <div class="form-group">
          <FloatLabel>
            <Calendar
              id="end-date"
              v-model="endDateCalendar"
              showTime
              hourFormat="12"
              required
              class="w-full"
            />
            <label for="end-date">End Date *</label>
          </FloatLabel>
        </div>
      </div>

      <div class="form-group">
        <div class="checkbox-wrapper">
          <Checkbox
            id="allDay"
            v-model="eventData.allDay"
            binary
          />
          <label for="allDay" class="checkbox-label">All Day Event</label>
        </div>
      </div>

      <!-- Visibility -->
      <div class="form-group">
        <FloatLabel>
          <Dropdown
            id="visibility"
            v-model="eventData.visibility"
            :options="visibilityOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
          <label for="visibility">Visibility</label>
        </FloatLabel>
      </div>

      <!-- Recurrence -->
      <div class="form-group">
        <div class="checkbox-wrapper">
          <Checkbox
            id="recurring"
            v-model="eventData.isRecurring"
            binary
          />
          <label for="recurring" class="checkbox-label">Recurring Event</label>
        </div>
      </div>

      <Panel v-if="eventData.isRecurring" header="Recurrence Settings" class="recurrence-panel">
        <div class="form-row">
          <div class="form-group">
            <FloatLabel>
              <Dropdown
                id="frequency"
                v-model="recurrence.frequency"
                :options="frequencyOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
              <label for="frequency">Frequency</label>
            </FloatLabel>
          </div>

          <div class="form-group">
            <FloatLabel>
              <InputText
                id="interval"
                v-model.number="intervalInput"
                type="number"
                min="1"
                max="99"
                class="w-full"
              />
              <label for="interval">Every</label>
            </FloatLabel>
          </div>
        </div>

        <div v-if="recurrence.frequency === 'WEEKLY'" class="form-group">
          <label class="block mb-2">Days of the Week</label>
          <div class="weekdays">
            <div v-for="day in weekDays" :key="day.value" class="checkbox-wrapper">
              <Checkbox
                :id="`day-${day.value}`"
                v-model="selectedDays"
                :value="day.value"
              />
              <label :for="`day-${day.value}`" class="checkbox-label">{{ day.label }}</label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="block mb-2">End Recurrence</label>
          <div class="radio-group">
            <div class="radio-wrapper">
              <RadioButton
                id="never"
                v-model="recurrence.endMode"
                value="never"
              />
              <label for="never" class="radio-label">Never</label>
            </div>
            <div class="radio-wrapper">
              <RadioButton
                id="on_date"
                v-model="recurrence.endMode"
                value="on_date"
              />
              <label for="on_date" class="radio-label">On Date</label>
            </div>
            <div class="radio-wrapper">
              <RadioButton
                id="after_occurrences"
                v-model="recurrence.endMode"
                value="after_occurrences"
              />
              <label for="after_occurrences" class="radio-label">After</label>
            </div>
          </div>
        </div>

        <div v-if="recurrence.endMode === 'on_date'" class="form-group">
          <Calendar
            v-model="recurrenceEndDateCalendar"
            placeholder="End date"
            class="w-full"
          />
        </div>

        <div v-if="recurrence.endMode === 'after_occurrences'" class="form-group">
          <InputText
            v-model.number="occurrenceCountInput"
            type="number"
            min="1"
            max="999"
            placeholder="Number of occurrences"
            class="w-full"
          />
        </div>
      </Panel>

      <!-- Reminders -->
      <Panel header="Reminders" class="reminders-panel">
        <div class="reminders-section">
          <div
            v-for="(reminder, index) in eventData.reminders"
            :key="index"
            class="reminder-row"
          >
            <Dropdown
              v-model="reminder.minutesBefore"
              :options="reminderTimeOptions"
              optionLabel="label"
              optionValue="value"
              class="reminder-time"
            />
            <Dropdown
              v-model="reminder.notificationType"
              :options="notificationTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="reminder-type"
            />
            <Button
              type="button"
              @click="removeReminder(index)"
              severity="danger"
              size="small"
              icon="pi pi-trash"
              text
            />
          </div>
          <Button
            type="button"
            @click="addReminder"
            severity="success"
            size="small"
            icon="pi pi-plus"
            label="Add Reminder"
            text
            class="mt-2"
          />
        </div>
      </Panel>

      <!-- Form Actions -->
      <div class="form-actions mt-4">
        <Button
          type="button"
          @click="$emit('close')"
          severity="secondary"
          label="Cancel"
          icon="pi pi-times"
        />
        <Button
          type="submit"
          :disabled="!isFormValid"
          :label="isEditing ? 'Update Event' : 'Create Event'"
          icon="pi pi-check"
        />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { CalendarEvent, CreateEventData, RecurrenceRule, Reminder } from '@/services/api'

interface Props {
  event?: CalendarEvent
  initialDate?: Date
}

interface Emits {
  (e: 'close'): void
  (e: 'save', eventData: CreateEventData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isEditing = computed(() => !!props.event)
const isVisible = ref(true)

// Form data
const eventData = ref<CreateEventData & { reminders: Reminder[]; category: string; color: string }>({
  title: '',
  startDate: '',
  endDate: '',
  allDay: false,
  visibility: 'private',
  isRecurring: false,
  description: '',
  location: '',
  category: 'consulting',
  color: '#10b981',
  reminders: [],
  contactIds: [],
  estateIds: []
})

const recurrence = ref<RecurrenceRule>({
  frequency: 'WEEKLY',
  interval: 1,
  endMode: 'never'
})

// Form input strings for v-model.number
const intervalInput = ref('1')
const occurrenceCountInput = ref('')

const selectedDays = ref<string[]>([])

// Calendar date objects for PrimeVue Calendar components
const startDateCalendar = ref<Date | null>(null)
const endDateCalendar = ref<Date | null>(null) 
const recurrenceEndDateCalendar = ref<Date | null>(null)

// Options for dropdowns
const visibilityOptions = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
  { label: 'Team', value: 'team' }
]

const categoryOptions = [
  { label: 'Consulting', value: 'consulting' },
  { label: 'Visit', value: 'visit' },
  { label: 'Valuation', value: 'valuation' },
  { label: 'Follow-up Visit', value: 'follow_up_visit' },
  { label: 'Notary Appointment', value: 'notary_appointment' },
  { label: 'Handover', value: 'handover' }
]

const frequencyOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' }
]

const reminderTimeOptions = [
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 }
]

const notificationTypeOptions = [
  { label: 'Email', value: 'email' },
  { label: 'Push', value: 'push' },
  { label: 'Both', value: 'both' }
]

const weekDays = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' }
]

const isFormValid = computed(() => {
  return eventData.value.title.trim() !== '' &&
         startDateCalendar.value !== null &&
         endDateCalendar.value !== null
})

// Initialize form
onMounted(() => {
  if (props.event) {
    // Editing existing event - properly map API response structure
    eventData.value.title = props.event.title
    eventData.value.description = props.event.description || ''
    eventData.value.location = props.event.location || ''
    eventData.value.allDay = props.event.allDay || false
    eventData.value.visibility = props.event.visibility
    eventData.value.isRecurring = props.event.isRecurring
    eventData.value.category = (props.event as any).category || 'consulting'
    eventData.value.color = (props.event as any).color || '#10b981'
    eventData.value.contactIds = props.event.linkedContacts?.map(c => c.id) || []
    eventData.value.estateIds = props.event.linkedEstates?.map(e => e.id) || []

    // Map reminders from API structure to modal structure
    eventData.value.reminders = props.event.reminders?.map(apiReminder => ({
      id: '', // API doesn't return reminder ID, will be generated on save
      minutesBefore: apiReminder.minutesBefore,
      notificationType: apiReminder.type as 'email' | 'push' | 'both'
    })) || []

    startDateCalendar.value = new Date(props.event.startDate)
    endDateCalendar.value = new Date(props.event.endDate)

    if (props.event.recurrenceRule) {
      recurrence.value.frequency = props.event.recurrenceRule.frequency
      recurrence.value.interval = props.event.recurrenceRule.interval
      recurrence.value.endMode = props.event.recurrenceRule.endMode
      recurrence.value.occurrenceCount = props.event.recurrenceRule.occurrenceCount
      intervalInput.value = String(props.event.recurrenceRule.interval)
      occurrenceCountInput.value = props.event.recurrenceRule.occurrenceCount ? String(props.event.recurrenceRule.occurrenceCount) : ''
      selectedDays.value = props.event.recurrenceRule.byDay || []
      if (props.event.recurrenceRule.endDate) {
        recurrenceEndDateCalendar.value = new Date(props.event.recurrenceRule.endDate)
      }
    }
  } else {
    // Creating new event
    const now = new Date(props.initialDate || new Date())
    const endTime = new Date(now.getTime() + 60 * 60 * 1000) // Add 1 hour
    startDateCalendar.value = now
    endDateCalendar.value = endTime
  }
})

// Watch for changes to update ISO dates
watch([startDateCalendar, endDateCalendar], () => {
  if (startDateCalendar.value) {
    eventData.value.startDate = dayjs(startDateCalendar.value).toISOString()
  }
  if (endDateCalendar.value) {
    eventData.value.endDate = dayjs(endDateCalendar.value).toISOString()
  }
})

// Watch selected days for weekly recurrence
watch(selectedDays, (newDays) => {
  recurrence.value.byDay = newDays
})

// Watch recurrence end date
watch(recurrenceEndDateCalendar, (newDate) => {
  if (newDate) {
    recurrence.value.endDate = dayjs(newDate).toISOString()
  }
})

const addReminder = (): void => {
  eventData.value.reminders.push({
    id: '', // Will be generated by backend
    minutesBefore: 60,
    notificationType: 'email'
  })
}

const removeReminder = (index: number): void => {
  eventData.value.reminders.splice(index, 1)
}

const handleSubmit = (): void => {
  const submitData: CreateEventData = {
    ...eventData.value,
    reminders: eventData.value.reminders.map(r => ({
      minutesBefore: r.minutesBefore,
      notificationType: r.notificationType
    }))
  }

  if (eventData.value.isRecurring) {
    submitData.recurrenceRule = { 
      ...recurrence.value,
      interval: parseInt(intervalInput.value) || 1,
      occurrenceCount: occurrenceCountInput.value ? parseInt(occurrenceCountInput.value) : undefined
    }
  }

  emit('save', submitData)
}
</script>

<style scoped>
.event-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-wrapper,
.radio-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label,
.radio-label {
  font-weight: normal !important;
  margin-bottom: 0 !important;
}

.radio-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.recurrence-panel,
.reminders-panel {
  margin-top: 0.5rem;
}

.recurrence-panel :deep(.p-panel-content) {
  padding: 1.5rem;
}

.recurrence-panel .form-group {
  margin-bottom: 1.5rem;
}

.recurrence-panel .form-group:last-child {
  margin-bottom: 0;
}

.reminders-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reminder-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.reminder-time,
.reminder-type {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-content-border-color);
}

.w-full {
  width: 100%;
}

.block {
  display: block;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-picker {
  flex-shrink: 0;
}

.color-input {
  flex: 1;
  min-width: 120px;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.p-4 {
  padding: 1rem;
}

/* Custom styling for PrimeVue components */
:deep(.p-dialog-content) {
  padding: 0;
}

:deep(.p-panel-content) {
  padding: 1rem;
}

:deep(.p-floatlabel) {
  margin-top: 1rem;
}

:deep(.p-floatlabel label) {
  left: 0.75rem;
}

:deep(.p-panel .form-group) {
  margin-bottom: 1.25rem;
}

:deep(.p-panel .form-group:last-child) {
  margin-bottom: 0;
}
</style>