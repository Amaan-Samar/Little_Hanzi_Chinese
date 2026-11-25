<template>
  <section class="profile-panel">
    <header class="profile-hero">
      <button
        class="avatar-button"
        type="button"
        :title="profile.photo ? 'View profile photo' : 'Add profile photo'"
        @click="openPhotoViewer"
      >
        <img
          v-if="profile.photo"
          :src="profile.photo"
          alt="Profile photo"
          class="avatar-image"
        />
        <span v-else class="avatar-initials">{{ initials }}</span>
        <span v-if="!profile.photo" class="avatar-badge">
          <Camera :size="13" />
        </span>
      </button>

      <div class="hero-copy">
        <h2>{{ profile.name || 'Your profile' }}</h2>
        <p class="hero-location">
          <MapPin :size="13" />
          <span>{{ locationLine || 'Add your city and country' }}</span>
        </p>
        <p class="hero-note">
          Saved on this device and included in your database backups.
        </p>
      </div>

      <input
        ref="photoInput"
        type="file"
        accept="image/*"
        class="photo-input"
        @change="handlePhotoFile"
      />
    </header>

    <p v-if="photoError" class="photo-error">{{ photoError }}</p>

    <nav class="profile-tabs" role="tablist" aria-label="Profile sections">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="profile-tab"
        :class="{ active: activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="15" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Profile --------------------------------------------------------- -->
    <div v-if="activeTab === 'profile'" class="tab-panel">
      <div class="panel-card">
        <div class="card-heading">
          <div>
            <h3>Personal information</h3>
            <p>How you appear on articles you share.</p>
          </div>
          <span class="saved-pill">Auto-saved</span>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">Name</span>
            <input
              :value="profile.name"
              maxlength="40"
              placeholder="e.g. Amaan"
              class="text-input"
              @input="updateField('name', $event.target.value)"
            />
          </label>

          <label class="field">
            <span class="field-label">Email</span>
            <input
              :value="profile.email"
              type="email"
              maxlength="120"
              placeholder="you@example.com"
              class="text-input"
              @input="updateField('email', $event.target.value)"
            />
          </label>

          <label class="field">
            <span class="field-label">Phone number</span>
            <input
              :value="profile.phone"
              type="tel"
              maxlength="40"
              placeholder="+91 00000 00000"
              class="text-input"
              @input="updateField('phone', $event.target.value)"
            />
          </label>

          <label class="field">
            <span class="field-label">Occupation</span>
            <input
              :value="profile.occupation"
              maxlength="80"
              placeholder="e.g. Student, Teacher, Engineer"
              class="text-input"
              @input="updateField('occupation', $event.target.value)"
            />
          </label>
        </div>

        <div class="panel-actions">
          <button class="ghost-btn" type="button" @click="$emit('reset-profile')">
            Clear profile
          </button>
          <button class="ghost-btn" type="button" @click="$emit('scan-qr')">
            <ScanLine :size="15" />
            Scan QR code
          </button>
        </div>
      </div>
    </div>

    <!-- Location -------------------------------------------------------- -->
    <div v-else-if="activeTab === 'location'" class="tab-panel">
      <div class="panel-card">
        <div class="card-heading">
          <div>
            <h3>Location</h3>
            <p>Share where you are learning from. No map or GPS is used.</p>
          </div>
          <span class="saved-pill">Auto-saved</span>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">Country</span>
            <input
              :value="profile.country"
              maxlength="60"
              placeholder="e.g. India"
              class="text-input"
              @input="updateField('country', $event.target.value)"
            />
          </label>

          <label class="field">
            <span class="field-label">City</span>
            <input
              :value="profile.city"
              maxlength="60"
              placeholder="e.g. Mumbai"
              class="text-input"
              @input="updateField('city', $event.target.value)"
            />
          </label>

          <label class="field field-wide">
            <span class="field-label">Address or neighbourhood</span>
            <textarea
              :value="profile.address"
              maxlength="240"
              rows="3"
              placeholder="Street, area, or anything you want to remember"
              class="text-input textarea"
              @input="updateField('address', $event.target.value)"
            ></textarea>
          </label>
        </div>

        <div class="location-preview">
          <MapPin :size="16" />
          <span>{{ locationLine || 'Country and city will appear here.' }}</span>
        </div>
      </div>
    </div>

    <!-- About ----------------------------------------------------------- -->
    <div v-else-if="activeTab === 'about'" class="tab-panel">
      <div class="panel-card">
        <div class="card-heading">
          <div>
            <h3>About you</h3>
            <p>A short introduction shown with shared articles.</p>
          </div>
          <span class="saved-pill">Auto-saved</span>
        </div>

        <label class="field">
          <span class="field-label">Bio</span>
          <textarea
            :value="profile.bio"
            maxlength="600"
            rows="7"
            placeholder="e.g. Learning Chinese one paragraph at a time. Ask me about my favourite stories!"
            class="text-input textarea"
            @input="updateField('bio', $event.target.value)"
          ></textarea>
        </label>
        <p class="char-count">{{ (profile.bio || '').length }} / 600</p>
      </div>
    </div>

    <!-- Fonts ----------------------------------------------------------- -->
    <div v-else-if="activeTab === 'fonts'" class="tab-panel">
      <SettingsPanel
        section="fonts"
        :settings="settings"
        @save="$emit('save-settings', $event)"
        @reset="$emit('reset-settings')"
      />
    </div>

    <!-- Settings -------------------------------------------------------- -->
    <div v-else-if="activeTab === 'settings'" class="tab-panel">
      <SettingsPanel
        section="display"
        :settings="settings"
        @save="$emit('save-settings', $event)"
        @reset="$emit('reset-settings')"
      />
    </div>

    <!-- Data ------------------------------------------------------------ -->
    <div v-else-if="activeTab === 'data'" class="tab-panel">
      <div class="panel-card">
        <div class="card-heading">
          <div>
            <h3>Database &amp; export</h3>
            <p>
              Keep a durable copy of your library, profile, and reading
              progress on this device.
            </p>
          </div>
          <span class="db-pill" :class="statusTone">{{ statusLabel }}</span>
        </div>

        <div class="db-status">
          <div class="db-icon" :class="statusTone">
            <ShieldCheck v-if="backupStatus === 'connected'" :size="19" />
            <AlertTriangle
              v-else-if="backupStatus === 'needs-permission' || backupStatus === 'error'"
              :size="19"
            />
            <Database v-else :size="19" />
          </div>
          <div class="db-copy">
            <strong>{{ statusTitle }}</strong>
            <span>{{ statusDetail }}</span>
            <em v-if="backupFileName">{{ backupFileName }}</em>
            <em v-if="backupLastSaved">Last saved {{ formatSaved(backupLastSaved) }}</em>
          </div>
        </div>

        <div class="db-actions">
          <button
            v-if="backupStatus === 'needs-permission'"
            class="primary-btn"
            type="button"
            @click="$emit('reconnect-backup')"
          >
            <RefreshCw :size="14" />
            Reconnect
          </button>
          <button
            v-else-if="backupStatus === 'off' || backupStatus === 'error'"
            class="primary-btn"
            type="button"
            :disabled="!backupSupported"
            @click="$emit('choose-backup')"
          >
            <FolderOpen :size="14" />
            Connect database file
          </button>
          <button
            v-if="backupStatus === 'connected'"
            class="ghost-btn"
            type="button"
            @click="$emit('disable-backup')"
          >
            <Link2Off :size="14" />
            Disconnect
          </button>
          <button class="ghost-btn" type="button" @click="$emit('download-backup')">
            <Download :size="14" />
            Download database
          </button>
          <button class="ghost-btn" type="button" @click="$emit('import-backup')">
            <Upload :size="14" />
            Open shared file
          </button>
          <button class="ghost-btn" type="button" @click="$emit('export-share')">
            <Share2 :size="14" />
            Share library
          </button>
        </div>

        <p v-if="!backupSupported" class="db-note">
          This browser cannot write files automatically. Downloading a database
          file still works everywhere.
        </p>

        <div class="data-stats">
          <div class="data-stat">
            <strong>{{ articleCount }}</strong>
            <span>{{ articleCount === 1 ? 'article' : 'articles' }}</span>
          </div>
          <div class="data-stat">
            <strong>{{ profile.photo ? 'Yes' : 'No' }}</strong>
            <span>profile photo saved</span>
          </div>
        </div>

        <p class="db-note">
          Backups include your profile details and photo, so restoring the file
          on another device brings your identity with it.
        </p>
      </div>
    </div>

    <!-- Full photo viewer: click the avatar to view, change, or remove it. -->
    <Teleport to="body">
      <div
        v-if="isPhotoViewerOpen"
        class="photo-viewer-overlay"
        @click="closePhotoViewer"
      >
        <div class="photo-viewer" @click.stop>
          <button
            class="viewer-close"
            type="button"
            title="Close"
            @click="closePhotoViewer"
          >
            <X :size="18" />
          </button>

          <img
            :src="profile.photo"
            alt="Profile photo"
            class="photo-viewer-image"
          />

          <div class="viewer-actions">
            <button
              class="primary-btn"
              type="button"
              @click="changePhotoFromViewer"
            >
              <Camera :size="15" />
              Change photo
            </button>
            <button
              class="ghost-btn danger"
              type="button"
              @click="removePhotoFromViewer"
            >
              <Trash2 :size="15" />
              Remove photo
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Camera,
  MapPin,
  User,
  FileText,
  Type,
  Settings,
  Database,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Link2Off,
  Download,
  Upload,
  Share2,
  X,
  Trash2,
} from 'lucide-vue-next'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
  settings: {
    type: Object,
    required: true,
  },
  backupSupported: { type: Boolean, default: false },
  backupStatus: { type: String, default: 'off' },
  backupFileName: { type: String, default: '' },
  backupLastSaved: { type: Number, default: null },
  articleCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'update-profile',
  'reset-profile',
  'save-settings',
  'reset-settings',
  'choose-backup',
  'reconnect-backup',
  'disable-backup',
  'download-backup',
  'import-backup',
  'export-share',
  'scan-qr',
])

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'about', label: 'About', icon: FileText },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'data', label: 'Data', icon: Database },
]

const activeTab = ref('profile')
const photoInput = ref(null)
const photoError = ref('')
const isPhotoViewerOpen = ref(false)

const MAX_PHOTO_BYTES = 12 * 1024 * 1024
const PHOTO_SIZE = 256
const PHOTO_MAX_CHARS = 400000

const initials = computed(() => {
  const name = (props.profile.name || '').trim()
  if (!name) return '你'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
})

const locationLine = computed(() => {
  const parts = [props.profile.city, props.profile.country]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(', ')
})

const statusTone = computed(() => {
  if (props.backupStatus === 'connected') return 'is-good'
  if (
    props.backupStatus === 'needs-permission' ||
    props.backupStatus === 'error'
  ) {
    return 'is-warn'
  }
  return 'is-off'
})

const statusLabel = computed(() => {
  switch (props.backupStatus) {
    case 'connected':
      return 'Connected'
    case 'needs-permission':
      return 'Permission needed'
    case 'error':
      return 'Error'
    case 'unsupported':
      return 'Download only'
    default:
      return 'Not connected'
  }
})

const statusTitle = computed(() => {
  switch (props.backupStatus) {
    case 'connected':
      return 'Database file connected'
    case 'needs-permission':
      return 'Database file needs permission'
    case 'error':
      return 'Could not write the database'
    case 'unsupported':
      return 'Auto-backup is not available here'
    default:
      return 'No database file connected'
  }
})

const statusDetail = computed(() => {
  switch (props.backupStatus) {
    case 'connected':
      return `${props.articleCount} article${props.articleCount === 1 ? '' : 's'} kept in sync automatically.`
    case 'needs-permission':
      return 'Reconnect to let the app write to your existing file.'
    case 'error':
      return 'Check that the file still exists, then choose it again.'
    case 'unsupported':
      return 'Use Download database to keep a copy.'
    default:
      return 'Choose a file once and it stays up to date as you read.'
  }
})

const formatSaved = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const updateField = (key, value) => {
  emit('update-profile', { ...props.profile, [key]: value })
}

const pickPhoto = () => {
  photoError.value = ''
  photoInput.value?.click()
}

const removePhoto = () => {
  photoError.value = ''
  emit('update-profile', { ...props.profile, photo: '' })
}

// Clicking the avatar opens the full photo; with no photo it picks one.
const openPhotoViewer = () => {
  photoError.value = ''
  if (props.profile.photo) {
    isPhotoViewerOpen.value = true
  } else {
    pickPhoto()
  }
}

const closePhotoViewer = () => {
  isPhotoViewerOpen.value = false
}

const changePhotoFromViewer = () => {
  isPhotoViewerOpen.value = false
  pickPhoto()
}

const removePhotoFromViewer = () => {
  isPhotoViewerOpen.value = false
  removePhoto()
}

// Resize and center-crop the chosen image so a profile photo stays small
// enough for localStorage and backup files.
const processPhoto = (dataUrl) => {
  const image = new Image()
  image.onload = () => {
    const sourceSize = Math.min(image.width, image.height)
    if (!sourceSize) {
      photoError.value = 'That image could not be read.'
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = PHOTO_SIZE
    canvas.height = PHOTO_SIZE
    const context = canvas.getContext('2d')
    if (!context) {
      photoError.value = 'Your browser could not process that image.'
      return
    }

    context.drawImage(
      image,
      (image.width - sourceSize) / 2,
      (image.height - sourceSize) / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      PHOTO_SIZE,
      PHOTO_SIZE,
    )

    let photo = canvas.toDataURL('image/jpeg', 0.84)
    if (photo.length > PHOTO_MAX_CHARS) {
      photo = canvas.toDataURL('image/jpeg', 0.6)
    }
    if (photo.length > PHOTO_MAX_CHARS) {
      photoError.value = 'That photo is still too large. Try a smaller image.'
      return
    }

    emit('update-profile', { ...props.profile, photo })
  }
  image.onerror = () => {
    photoError.value = 'That file is not a supported image.'
  }
  image.src = dataUrl
}

const handlePhotoFile = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  photoError.value = ''
  if (!file.type.startsWith('image/')) {
    photoError.value = 'Choose an image file (JPEG, PNG, WebP, or GIF).'
    return
  }
  if (file.size > MAX_PHOTO_BYTES) {
    photoError.value = 'Choose an image smaller than 12 MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => processPhoto(String(reader.result || ''))
  reader.onerror = () => {
    photoError.value = 'That image could not be read.'
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.profile-panel {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 22px 16px 130px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px;
  margin-bottom: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e9ecef;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.avatar-button {
  position: relative;
  width: 74px;
  height: 74px;
  padding: 0;
  border: none;
  border-radius: 24px;
  overflow: visible;
  background: linear-gradient(135deg, #4a6cf7 0%, #6c5ce7 100%);
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(74, 108, 247, 0.28);
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  object-fit: cover;
  display: block;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.avatar-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e9ecef;
  color: #4a6cf7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14);
}

.hero-copy {
  flex: 1;
  min-width: 180px;
}

.hero-copy h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #1f2937;
}

.hero-location {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0 0;
  font-size: 12px;
  color: #4a6cf7;
  font-weight: 600;
}

.hero-note {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #94a3b8;
}

.photo-input {
  display: none;
}

.photo-error {
  margin: -4px 0 12px;
  padding: 9px 12px;
  border-radius: 9px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 12px;
}

.profile-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  padding: 5px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid #e9ecef;
  overflow-x: auto;
  scrollbar-width: none;
}

.profile-tabs::-webkit-scrollbar {
  display: none;
}

.profile-tab {
  flex: 1;
  min-width: 88px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s;
}

.profile-tab:hover {
  background: #f8f9fa;
  color: #334155;
}

.profile-tab.active {
  background: #eef1ff;
  border-color: #d8defb;
  color: #4a6cf7;
  box-shadow: 0 3px 9px rgba(74, 108, 247, 0.12);
}

.tab-panel {
  animation: panelIn 0.18s ease;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-card {
  padding: 18px;
  margin-bottom: 16px;
  border-radius: 18px;
  background: white;
  border: 1px solid #e9ecef;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}

.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-heading h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.card-heading p {
  margin: 3px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #94a3b8;
}

.saved-pill,
.db-pill {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.saved-pill {
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  color: #04855b;
}

.db-pill.is-good {
  background: #eef1ff;
  border: 1px solid #d8defb;
  color: #4a6cf7;
}

.db-pill.is-warn {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #b45309;
}

.db-pill.is-off {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #94a3b8;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: block;
}

.field-wide {
  grid-column: 1 / -1;
}

.field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e9ecef;
  border-radius: 9px;
  background: #f8f9fa;
  color: #374151;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.text-input:focus {
  border-color: #4a6cf7;
  background: white;
}

.textarea {
  resize: vertical;
  min-height: 74px;
}

.char-count {
  margin: 7px 0 0;
  text-align: right;
  font-size: 10.5px;
  color: #adb5bd;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.location-preview {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 11px 13px;
  border-radius: 11px;
  background: #f8f9fa;
  border: 1px dashed #dbe1e8;
  color: #64748b;
  font-size: 12.5px;
}

.db-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px;
  border-radius: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.db-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.db-icon.is-good {
  background: #eef1ff;
  color: #4a6cf7;
}

.db-icon.is-warn {
  background: #fffbeb;
  color: #b45309;
}

.db-icon.is-off {
  background: #f1f5f9;
  color: #94a3b8;
}

.db-copy {
  flex: 1;
  min-width: 0;
}

.db-copy strong {
  display: block;
  font-size: 13px;
  color: #1f2937;
}

.db-copy span {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.45;
  color: #6b7280;
}

.db-copy em {
  display: block;
  margin-top: 3px;
  font-size: 10.5px;
  font-style: normal;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.db-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
}

.primary-btn {
  background: #4a6cf7;
  color: white;
  border: 1px solid transparent;
}

.primary-btn:hover:not(:disabled) {
  background: #3a5ce8;
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ghost-btn {
  background: white;
  color: #495057;
  border: 1px solid #e9ecef;
}

.ghost-btn:hover {
  background: #f8f9fa;
  border-color: #cbd5e1;
}

.ghost-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
}

/* Full photo viewer */
.photo-viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 3000;
  animation: viewerFade 0.18s ease;
}

@keyframes viewerFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.photo-viewer {
  position: relative;
  width: min(92vw, 460px);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 20px;
  background: white;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.photo-viewer-image {
  width: 100%;
  max-height: 62vh;
  object-fit: contain;
  border-radius: 14px;
  background: #f1f5f9;
  display: block;
}

.viewer-actions {
  display: flex;
  gap: 8px;
}

.viewer-actions .primary-btn,
.viewer-actions .ghost-btn {
  flex: 1;
  justify-content: center;
}

.viewer-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #e9ecef;
  background: white;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.viewer-close:hover {
  background: #f8f9fa;
  color: #334155;
}

.db-note {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #94a3b8;
}

.data-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.data-stat {
  padding: 12px;
  border-radius: 11px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.data-stat strong {
  display: block;
  font-size: 18px;
  color: #1f2937;
}

.data-stat span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
}

@media (max-width: 640px) {
  .profile-panel {
    padding: 16px 12px 128px;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    padding: 16px;
  }

  .profile-tab {
    min-width: 74px;
    padding: 8px 10px;
    font-size: 11.5px;
  }

  .data-stats {
    grid-template-columns: 1fr;
  }
}
</style>
