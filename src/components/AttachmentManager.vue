<template>
  <div class="attachment-manager">
    <div class="form-group">
      <label class="block mb-2 font-medium">Event Attachments</label>
      
      <!-- File Upload Area -->
      <div class="upload-section">
        <FileUpload
          ref="fileUpload"
          mode="advanced"
          :multiple="true"
          :maxFileSize="maxFileSize"
          :accept="acceptedTypes"
          :showUploadButton="false"
          :showCancelButton="false"
          :customUpload="true"
          @uploader="uploadFiles"
          @select="onFilesSelected"
          @remove="onFileRemoved"
          class="upload-area"
        >
          <template #header="{ chooseCallback, clearCallback, files }">
            <div class="flex flex-wrap justify-content-between align-items-center flex-1 gap-2">
              <div class="flex gap-2">
                <Button
                  @click="chooseCallback()"
                  icon="pi pi-plus"
                  rounded
                  outlined
                  severity="secondary"
                />
                <Button
                  @click="clearCallback()"
                  icon="pi pi-times"
                  rounded
                  outlined
                  severity="danger"
                  :disabled="!files || files.length === 0"
                />
              </div>
              <ProgressBar
                v-if="uploading"
                :value="uploadProgress"
                :showValue="false"
                style="width: 10rem; height: 12px"
                class="flex-auto"
              />
            </div>
          </template>
          
          <template #content="{ files, removeFileCallback }">
            <div v-if="files.length > 0">
              <div class="flex flex-wrap p-0 sm:p-5 gap-5">
                <div
                  v-for="(file, index) of files"
                  :key="file.name + file.type + file.size"
                  class="card m-0 px-6 flex flex-column border-1 surface-border align-items-center gap-3"
                  style="width: 200px"
                >
                  <!-- File Preview -->
                  <div class="file-preview">
                    <img
                      v-if="file.type.startsWith('image/')"
                      role="presentation"
                      :alt="file.name"
                      :src="(file as FileWithObjectURL).objectURL || getFileURL(file)"
                      width="100"
                      height="50"
                      class="shadow-2"
                    />
                    <i
                      v-else
                      :class="getFileIcon(file.type)"
                      style="font-size: 2rem;"
                    />
                  </div>
                  
                  <!-- File Info -->
                  <span class="font-semibold text-sm">{{ file.name }}</span>
                  <div class="text-xs text-color-secondary">{{ formatFileSize(file.size) }}</div>
                  
                  <!-- Remove Button -->
                  <Button
                    icon="pi pi-times"
                    @click="removeFileCallback(index)"
                    outlined
                    rounded
                    severity="danger"
                    class="remove-btn"
                  />
                </div>
              </div>
            </div>
          </template>
          
          <template #empty>
            <div class="flex align-items-center justify-content-center flex-column p-5">
              <i class="pi pi-cloud-upload border-2 border-circle p-5 text-8xl text-400 border-400" />
              <p class="mt-4 mb-0">Drag and drop files here to upload.</p>
              <p class="text-color-secondary mb-0">Maximum file size: 50MB</p>
            </div>
          </template>
        </FileUpload>
        
        <!-- Upload Button -->
        <Button
          v-if="pendingFiles.length > 0"
          @click="uploadSelectedFiles"
          :loading="uploading"
          icon="pi pi-upload"
          label="Upload Files"
          class="mt-3"
          :disabled="uploading"
        />
      </div>
    </div>

    <!-- Existing Attachments -->
    <div v-if="attachments.length > 0" class="existing-attachments">
      <Divider />
      <h5>Current Attachments ({{ attachments.length }})</h5>
      
      <div class="attachments-grid">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="attachment-item"
        >
          <div class="attachment-content">
            <!-- File Icon/Preview -->
            <div class="attachment-preview">
              <img
                v-if="getAttachmentMimeType(attachment).startsWith('image/')"
                :src="attachment.url"
                :alt="attachment.filename"
                class="attachment-thumbnail"
                @click="previewAttachment(attachment)"
              />
              <i
                v-else
                :class="getFileIcon(getAttachmentMimeType(attachment))"
                @click="previewAttachment(attachment)"
                class="attachment-icon"
              />
            </div>
            
            <!-- File Info -->
            <div class="attachment-info">
              <div class="attachment-name" :title="attachment.filename">
                {{ attachment.filename }}
              </div>
              <div class="attachment-size">
                {{ formatFileSize(attachment.size) }}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="attachment-actions">
              <Button
                @click="downloadAttachment(attachment)"
                icon="pi pi-download"
                rounded
                outlined
                size="small"
                severity="info"
                v-tooltip="'Download'"
              />
              <Button
                @click="confirmDeleteAttachment(attachment)"
                icon="pi pi-trash"
                rounded
                outlined
                size="small"
                severity="danger"
                v-tooltip="'Delete'"
                :disabled="deleting"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Preview Dialog -->
    <Dialog
      v-model:visible="showPreview"
      :header="previewFile?.filename"
      :style="{ width: '80vw', height: '80vh' }"
      :modal="true"
      :closable="true"
    >
      <div class="preview-content">
        <img
          v-if="previewFile && getAttachmentMimeType(previewFile).startsWith('image/')"
          :src="previewFile.url"
          :alt="previewFile.filename"
          class="preview-image"
        />
        <video
          v-else-if="previewFile && getAttachmentMimeType(previewFile).startsWith('video/')"
          :src="previewFile.url"
          controls
          class="preview-video"
        >
          Your browser does not support the video tag.
        </video>
        <iframe
          v-else-if="previewFile && getAttachmentMimeType(previewFile) === 'application/pdf'"
          :src="previewFile.url"
          class="preview-pdf"
        />
        <div v-else class="preview-fallback">
          <i :class="getFileIcon(previewFile ? getAttachmentMimeType(previewFile) : '')" class="large-icon" />
          <p>Preview not available for this file type.</p>
          <Button @click="downloadAttachment(previewFile!)" label="Download File" />
        </div>
      </div>
    </Dialog>
    
    <!-- Delete Confirmation -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { calendarAPI, type Attachment, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, getFileIcon, formatFileSize } from '@/services/api'

interface FileWithObjectURL extends File {
  objectURL?: string
}

// Helper function to determine file type from filename when mimeType is missing
function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  const mimeTypeMap: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'webm': 'video/webm',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  }
  return mimeTypeMap[extension || ''] || 'application/octet-stream'
}

// Helper function to safely get mimeType
function getAttachmentMimeType(attachment: Attachment): string {
  return attachment.mimeType || getMimeTypeFromFilename(attachment.filename)
}

interface Props {
  eventId?: string
  attachments: Attachment[]
}

interface Emits {
  (e: 'attachmentsUpdated', attachments: Attachment[]): void
  (e: 'uploadProgress', progress: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const confirm = useConfirm()
const toast = useToast()

// Refs
const fileUpload = ref()
const uploading = ref(false)
const uploadProgress = ref(0)
const deleting = ref(false)
const showPreview = ref(false)
const previewFile = ref<Attachment | null>(null)
const pendingFiles = ref<FileWithObjectURL[]>([])

// Constants
const maxFileSize = MAX_FILE_SIZE
const acceptedTypes = computed(() => {
  const allTypes = [
    ...SUPPORTED_FILE_TYPES.images,
    ...SUPPORTED_FILE_TYPES.documents,
    ...SUPPORTED_FILE_TYPES.videos
  ]
  return allTypes.join(',')
})

// File handling
function onFilesSelected(event: any) {
  pendingFiles.value = event.files
}

function onFileRemoved(event: any) {
  pendingFiles.value = pendingFiles.value.filter(file => file !== event.file)
}

function getFileURL(file: FileWithObjectURL): string {
  return URL.createObjectURL(file)
}

async function uploadSelectedFiles() {
  if (!props.eventId || pendingFiles.value.length === 0) return
  
  uploading.value = true
  uploadProgress.value = 0
  
  try {
    const response = await calendarAPI.uploadAttachments(props.eventId, pendingFiles.value)
    
    // Clear pending files
    pendingFiles.value = []
    fileUpload.value.clear()
    
    // Update attachments list
    const updatedAttachments = [...props.attachments, ...response.data.attachments]
    emit('attachmentsUpdated', updatedAttachments)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${response.data.attachments.length} file(s) uploaded successfully`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Upload failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Upload Failed',
      detail: error.response?.data?.message || 'Failed to upload files',
      life: 5000
    })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function uploadFiles() {
  uploadSelectedFiles()
}

function confirmDeleteAttachment(attachment: Attachment) {
  confirm.require({
    message: `Are you sure you want to delete "${attachment.filename}"?`,
    header: 'Delete Attachment',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteAttachment(attachment),
    reject: () => {}
  })
}

async function deleteAttachment(attachment: Attachment) {
  if (!props.eventId) return
  
  deleting.value = true
  
  try {
    await calendarAPI.deleteAttachment(props.eventId, attachment.id)
    
    // Update attachments list
    const updatedAttachments = props.attachments.filter(a => a.id !== attachment.id)
    emit('attachmentsUpdated', updatedAttachments)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Attachment deleted successfully',
      life: 3000
    })
  } catch (error: any) {
    console.error('Delete failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: error.response?.data?.message || 'Failed to delete attachment',
      life: 5000
    })
  } finally {
    deleting.value = false
  }
}

function previewAttachment(attachment: Attachment) {
  previewFile.value = attachment
  showPreview.value = true
}

function downloadAttachment(attachment: Attachment) {
  const link = document.createElement('a')
  link.href = attachment.url
  link.download = attachment.filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.attachment-manager {
  width: 100%;
}

.upload-area {
  margin-bottom: 1rem;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.attachment-item {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  background: var(--surface-card);
}

.attachment-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.attachment-preview {
  flex-shrink: 0;
}

.attachment-thumbnail {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.attachment-icon {
  font-size: 2rem;
  color: var(--text-color-secondary);
  cursor: pointer;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.attachment-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
}

.preview-pdf {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-fallback {
  text-align: center;
}

.large-icon {
  font-size: 4rem;
  color: var(--text-color-secondary);
  display: block;
  margin-bottom: 1rem;
}

.remove-btn {
  width: 2rem;
  height: 2rem;
}
</style>