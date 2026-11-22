<template>
  <Teleport to="body">
    <div v-if="isOpen" class="backup-modal-overlay" @click="close">
      <div class="backup-modal" @click.stop>
        <button class="close-btn" @click="close" title="Close">
          <X :size="18" />
        </button>

        <div class="backup-modal-body">
          <h3 class="backup-title">Database &amp; export</h3>
          <p class="backup-subtitle">
            Your library stays in this browser, but a backup database file lives
            on your disk. Clearing browser data won't touch it.
          </p>

          <!-- Connection status -->
          <div class="status-card">
            <div class="status-row">
              <div class="status-icon" :class="statusTone">
                <ShieldCheck v-if="backupStatus === 'connected'" :size="20" />
                <AlertTriangle
                  v-else-if="backupStatus === 'needs-permission' || backupStatus === 'error'"
                  :size="20"
                />
                <Database v-else :size="20" />
              </div>
              <div class="status-copy">
                <p class="status-title">{{ statusTitle }}</p>
                <p class="status-detail">{{ statusDetail }}</p>
                <p v-if="backupFileName" class="status-file">
                  {{ backupFileName }}
                </p>
                <p v-if="backupLastSaved" class="status-file">
                  Last saved {{ formatSaved(backupLastSaved) }}
                </p>
              </div>
            </div>

            <div class="status-actions">
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
            </div>
          </div>

          <!-- Export / import -->
          <div class="export-section">
            <label class="section-label">Move your library</label>
            <div class="export-list">
              <button class="row-btn" @click="$emit('download-backup')">
                <Download :size="17" class="row-icon" />
                <span class="row-copy">
                  <span class="row-title">Download database</span>
                  <span class="row-sub">
                    Save all articles, likes, bookmarks, and archives
                  </span>
                </span>
                <span class="row-count">{{ articleCount }}</span>
              </button>

              <button class="row-btn" @click="$emit('import-backup')">
                <Upload :size="17" class="row-icon" />
                <span class="row-copy">
                  <span class="row-title">Open a shared file or backup</span>
                  <span class="row-sub">Pick a .json file from this device</span>
                </span>
              </button>

              <button class="row-btn" @click="$emit('export-share')">
                <Share2 :size="17" class="row-icon" />
                <span class="row-copy">
                  <span class="row-title">Share my whole library</span>
                  <span class="row-sub">
                    Creates a bundle a friend can import as unread
                  </span>
                </span>
              </button>
            </div>
          </div>

          <p class="backup-footnote">
            Received an article file? Open it here, or drop the .json file onto
            the app. Imported articles arrive unread and keep the name of the
            person who shared them.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import {
  X,
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
  isOpen: { type: Boolean, default: false },
  backupSupported: { type: Boolean, default: false },
  backupStatus: { type: String, default: 'off' },
  backupFileName: { type: String, default: '' },
  backupLastSaved: { type: Number, default: null },
  articleCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'close',
  'choose-backup',
  'reconnect-backup',
  'disable-backup',
  'download-backup',
  'import-backup',
  'export-share',
])

const close = () => emit('close')

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

const statusTitle = computed(() => {
  switch (props.backupStatus) {
    case 'connected':
      return 'Database file connected'
    case 'needs-permission':
      return 'Database file needs permission'
    case 'error':
      return 'Database could not be written'
    case 'unsupported':
      return 'Auto-backup is not available here'
    default:
      return 'No database file connected'
  }
})

const statusDetail = computed(() => {
  switch (props.backupStatus) {
    case 'connected':
      return 'Changes are written to your database file automatically.'
    case 'needs-permission':
      return 'Reconnect to let the app write to your existing database file.'
    case 'error':
      return 'Check that the file still exists, then choose it again.'
    case 'unsupported':
      return 'This browser cannot write files automatically. Use Download database instead.'
    default:
      return 'Connect a file once and the app will keep it up to date as you read.'
  }
})

const formatSaved = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.backup-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.backup-modal {
  position: relative;
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e9ecef;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  transform: scale(1.08);
  background: #f8f9fa;
  color: #495057;
}

.backup-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
}

.backup-modal-body::-webkit-scrollbar {
  width: 5px;
}

.backup-modal-body::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.22);
  border-radius: 20px;
}

.backup-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.backup-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #6b7280;
}

.status-card {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: #f8f9fa;
}

.status-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.status-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon.is-good {
  background: #eef1ff;
  color: #4a6cf7;
}

.status-icon.is-warn {
  background: #fffbeb;
  color: #b45309;
}

.status-icon.is-off {
  background: #f1f5f9;
  color: #94a3b8;
}

.status-copy {
  flex: 1;
  min-width: 0;
}

.status-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2937;
}

.status-detail {
  margin: 2px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #6b7280;
}

.status-file {
  margin: 3px 0 0;
  font-size: 10.5px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-actions {
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

.export-section {
  margin-top: 20px;
}

.section-label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.export-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-btn {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 11px 12px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s;
  text-align: left;
}

.row-btn:hover {
  background: #f8f9fa;
  border-color: #cbd5e1;
}

.row-icon {
  color: #4a6cf7;
  flex-shrink: 0;
}

.row-copy {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #1f2937;
}

.row-sub {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  line-height: 1.35;
  color: #94a3b8;
}

.row-count {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.backup-footnote {
  margin: 18px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #adb5bd;
}

@media (max-width: 520px) {
  .backup-modal-body {
    padding: 20px;
  }
}
</style>
