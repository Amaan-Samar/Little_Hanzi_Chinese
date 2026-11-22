<template>
  <section class="profile-panel">
    <header class="profile-hero">
      <div class="avatar">{{ initials }}</div>
      <div class="hero-copy">
        <h2>{{ profile.name || 'Your profile' }}</h2>
        <p>
          Keep your details on this device. They personalise shares and stay
          private unless you send them.
        </p>
      </div>
    </header>

    <div class="panel-card">
      <div class="card-heading">
        <div>
          <h3>Personal information</h3>
          <p>Saved automatically in this browser.</p>
        </div>
        <span class="saved-pill">Saved</span>
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

        <label class="field field-wide">
          <span class="field-label">Address</span>
          <textarea
            :value="profile.address"
            maxlength="240"
            rows="3"
            placeholder="Street, city, country"
            class="text-input textarea"
            @input="updateField('address', $event.target.value)"
          ></textarea>
        </label>
      </div>

      <div class="panel-actions">
        <button class="ghost-btn" @click="$emit('reset-profile')">
          Clear profile
        </button>
        <button class="ghost-btn" @click="$emit('scan-qr')">
          <ScanLine :size="15" />
          Scan QR code
        </button>
      </div>
    </div>

    <div class="panel-card">
      <div class="card-heading">
        <div>
          <h3>Database &amp; export</h3>
          <p>Connect a file on this device to keep a durable copy of your library.</p>
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
          @click="$emit('reconnect-backup')"
        >
          <RefreshCw :size="14" />
          Reconnect
        </button>
        <button
          v-else-if="backupStatus === 'off' || backupStatus === 'error'"
          class="primary-btn"
          :disabled="!backupSupported"
          @click="$emit('choose-backup')"
        >
          <FolderOpen :size="14" />
          Connect database file
        </button>
        <button
          v-if="backupStatus === 'connected'"
          class="ghost-btn"
          @click="$emit('disable-backup')"
        >
          <Link2Off :size="14" />
          Disconnect
        </button>
        <button class="ghost-btn" @click="$emit('download-backup')">
          <Download :size="14" />
          Download database
        </button>
        <button class="ghost-btn" @click="$emit('import-backup')">
          <Upload :size="14" />
          Open shared file
        </button>
        <button class="ghost-btn" @click="$emit('export-share')">
          <Share2 :size="14" />
          Share library
        </button>
      </div>

      <p v-if="!backupSupported" class="db-note">
        This browser cannot write files automatically. Downloading a database
        file still works everywhere.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  ScanLine,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Link2Off,
  Download,
  Upload,
  Share2,
} from 'lucide-vue-next'

const props = defineProps({
  profile: {
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
  'choose-backup',
  'reconnect-backup',
  'disable-backup',
  'download-backup',
  'import-backup',
  'export-share',
  'scan-qr',
])

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
</script>

<style scoped>
.profile-panel {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 22px 16px 120px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid #e9ecef;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #4a6cf7 0%, #6c5ce7 100%);
  color: white;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.hero-copy h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #1f2937;
}

.hero-copy p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
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

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
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

.db-note {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #94a3b8;
}

@media (max-width: 640px) {
  .profile-panel {
    padding: 16px 12px 118px;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    padding: 16px;
  }
}
</style>
