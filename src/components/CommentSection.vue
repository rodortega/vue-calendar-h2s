<template>
  <div class="comment-section">
    <div class="comment-header">
      <h4>Comments</h4>
      <Button
        v-if="eventId"
        @click="showAddComment = !showAddComment"
        icon="pi pi-plus"
        size="small"
        label="Add Comment"
        text
      />
    </div>

    <!-- Add Comment Form -->
    <div v-if="showAddComment && eventId" class="add-comment-form">
      <div class="form-group">
        <Textarea
          v-model="newComment"
          placeholder="Write your comment here..."
          rows="3"
          class="w-full"
          :maxlength="5000"
        />
        <small class="character-count" :class="{ 'text-danger': newComment.length > 4500 }">
          {{ newComment.length }}/5000
        </small>
      </div>
      <div class="comment-actions">
        <Button
          @click="cancelAddComment"
          label="Cancel"
          severity="secondary"
          size="small"
          text
        />
        <Button
          @click="submitComment"
          label="Add Comment"
          icon="pi pi-check"
          size="small"
          :disabled="!newComment.trim() || newComment.length > 5000"
          :loading="addingComment"
        />
      </div>
    </div>

    <!-- Comments List -->
    <div class="comments-list">
      <div v-if="loading && comments.length === 0" class="loading-state">
        <i class="pi pi-spinner pi-spin"></i>
        <span>Loading comments...</span>
      </div>

      <div v-else-if="comments.length === 0" class="empty-state">
        <i class="pi pi-comment"></i>
        <span>No comments yet</span>
        <small>Be the first to add a comment!</small>
      </div>

      <div v-else class="comments-container">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="comment-item"
        >
          <!-- Comment Content -->
          <div v-if="editingCommentId !== comment.id" class="comment-content">
            <div class="comment-header-info">
              <div class="comment-author">
                {{ getAuthorName(comment.createdBy) }}
              </div>
              <div class="comment-date">
                {{ formatDate(comment.createdAt) }}
                <span v-if="comment.updatedAt !== comment.createdAt" class="edited-indicator">
                  (edited {{ formatDate(comment.updatedAt) }})
                </span>
              </div>
            </div>
            <div class="comment-text">{{ comment.comment }}</div>
            <div class="comment-actions">
              <Button
                @click="startEditComment(comment)"
                icon="pi pi-pencil"
                size="small"
                text
                severity="info"
                v-tooltip="'Edit'"
              />
              <Button
                @click="confirmDeleteComment(comment)"
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                v-tooltip="'Delete'"
              />
            </div>
          </div>

          <!-- Edit Comment Form -->
          <div v-else class="edit-comment-form">
            <Textarea
              v-model="editCommentText"
              rows="3"
              class="w-full"
              :maxlength="5000"
            />
            <small class="character-count" :class="{ 'text-danger': editCommentText.length > 4500 }">
              {{ editCommentText.length }}/5000
            </small>
            <div class="comment-actions">
              <Button
                @click="cancelEditComment"
                label="Cancel"
                severity="secondary"
                size="small"
                text
              />
              <Button
                @click="submitEditComment(comment.id)"
                label="Save"
                icon="pi pi-check"
                size="small"
                :disabled="!editCommentText.trim() || editCommentText.length > 5000"
                :loading="updatingComment"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { calendarAPI } from '@/services/api'
import type { EventComment, EventCommentUser } from '@/services/api'

dayjs.extend(relativeTime)

interface Props {
  eventId?: string
}

interface Emits {
  (e: 'commentsUpdated', comments: EventComment[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const confirm = useConfirm()
const toast = useToast()

// Refs
const comments = ref<EventComment[]>([])
const loading = ref(false)
const showAddComment = ref(false)
const newComment = ref('')
const addingComment = ref(false)
const editingCommentId = ref<string | null>(null)
const editCommentText = ref('')
const updatingComment = ref(false)

// Methods
const loadComments = async (): Promise<void> => {
  if (!props.eventId) {
    comments.value = []
    return
  }

  loading.value = true
  try {
    const response = await calendarAPI.listComments(props.eventId)
    comments.value = response.data.comments
    emit('commentsUpdated', comments.value)
  } catch (error: any) {
    console.error('Failed to load comments:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load comments',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const submitComment = async (): Promise<void> => {
  if (!props.eventId || !newComment.value.trim()) return

  addingComment.value = true
  try {
    const response = await calendarAPI.addComment(props.eventId, {
      comment: newComment.value.trim()
    })
    
    // Add new comment to the beginning of the list
    comments.value.unshift(response.data)
    
    // Reset form
    newComment.value = ''
    showAddComment.value = false
    
    emit('commentsUpdated', comments.value)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Comment added successfully',
      life: 3000
    })
  } catch (error: any) {
    console.error('Failed to add comment:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to add comment',
      life: 3000
    })
  } finally {
    addingComment.value = false
  }
}

const cancelAddComment = (): void => {
  newComment.value = ''
  showAddComment.value = false
}

const startEditComment = (comment: EventComment): void => {
  editingCommentId.value = comment.id
  editCommentText.value = comment.comment
}

const cancelEditComment = (): void => {
  editingCommentId.value = null
  editCommentText.value = ''
}

const submitEditComment = async (commentId: string): Promise<void> => {
  if (!props.eventId || !editCommentText.value.trim()) return

  updatingComment.value = true
  try {
    const response = await calendarAPI.updateComment(props.eventId, commentId, {
      comment: editCommentText.value.trim()
    })
    
    // Update comment in the list
    const index = comments.value.findIndex(c => c.id === commentId)
    if (index !== -1) {
      comments.value[index] = response.data
    }
    
    // Reset edit form
    editingCommentId.value = null
    editCommentText.value = ''
    
    emit('commentsUpdated', comments.value)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Comment updated successfully',
      life: 3000
    })
  } catch (error: any) {
    console.error('Failed to update comment:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update comment',
      life: 3000
    })
  } finally {
    updatingComment.value = false
  }
}

const confirmDeleteComment = (comment: EventComment): void => {
  confirm.require({
    message: 'Are you sure you want to delete this comment?',
    header: 'Delete Comment',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteComment(comment.id),
    reject: () => {}
  })
}

const deleteComment = async (commentId: string): Promise<void> => {
  if (!props.eventId) return

  try {
    await calendarAPI.deleteComment(props.eventId, commentId)
    
    // Remove comment from the list
    comments.value = comments.value.filter(c => c.id !== commentId)
    
    emit('commentsUpdated', comments.value)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Comment deleted successfully',
      life: 3000
    })
  } catch (error: any) {
    console.error('Failed to delete comment:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to delete comment',
      life: 3000
    })
  }
}
    
const getAuthorName = (user: EventCommentUser | null | undefined): string => {
  return user?.name || 'Unknown User'
}

const formatDate = (dateString: string): string => {
  const date = dayjs(dateString)
  const now = dayjs()
  
  // If it's within the last 7 days, show relative time
  if (now.diff(date, 'day') < 7) {
    return date.fromNow()
  }
  
  // Otherwise show formatted date
  return date.format('MMM D, YYYY h:mm A')
}

// Watchers
watch(() => props.eventId, (newEventId) => {
  if (newEventId) {
    loadComments()
  } else {
    comments.value = []
  }
})

// Lifecycle
onMounted(() => {
  if (props.eventId) {
    loadComments()
  }
})
</script>

<style scoped>
.comment-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--p-content-border-color);
  margin-bottom: 1rem;
}

.comment-header h4 {
  margin: 0;
  color: var(--p-text-color);
}

.add-comment-form {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: var(--p-border-radius);
  border: 1px solid var(--p-content-border-color);
}

.form-group {
  margin-bottom: 0.75rem;
}

.character-count {
  display: block;
  text-align: right;
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.text-danger {
  color: var(--p-red-500) !important;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.loading-state i,
.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-state small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.comments-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-item {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  background: var(--p-surface-card);
}

.comment-content {
  padding: 1rem;
}

.comment-header-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.comment-author {
  font-weight: 600;
  color: var(--p-text-color);
}

.comment-date {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.edited-indicator {
  font-style: italic;
}

.comment-text {
  margin: 0.75rem 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-content .comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  margin-top: 0.75rem;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.comment-item:hover .comment-content .comment-actions {
  opacity: 1;
}

.edit-comment-form {
  padding: 1rem;
  background: var(--p-surface-100);
}

.edit-comment-form .comment-actions {
  margin-top: 0.75rem;
}

/* Utility classes */
.w-full {
  width: 100%;
}
</style>