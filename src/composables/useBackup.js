// Durable article backup using the File System Access API, with a
// download/upload fallback for browsers that do not support it.
import { ref } from 'vue'
import { downloadJson } from '../utils/sharePayload'

const DB_NAME = 'littleChinese_files'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'autoBackupFile'
const BACKUP_DELAY = 2000

let dbPromise = null

const openDb = () => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME)
          }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

const idbGet = async (key) => {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const idbSet = async (key, value) => {
  const db = await openDb()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(value, key)
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const idbDelete = async (key) => {
  const db = await openDb()
  if (!db) return
  try {
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key)
  } catch {
    // Ignore.
  }
}

const filePickerTypes = [
  {
    description: 'Little Hanzi backup',
    accept: { 'application/json': ['.json'] },
  },
]

const queryPermission = async (handle) => {
  if (!handle?.queryPermission) return 'granted'
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'prompt'
  }
}

const requestPermission = async (handle) => {
  if (!handle?.requestPermission) return 'granted'
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

const writeHandle = async (handle, data) => {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

export function useBackup() {
  const backupSupported = ref(
    typeof window !== 'undefined' && 'showSaveFilePicker' in window,
  )
  const autoBackupEnabled = ref(false)
  const backupFileName = ref('')
  const backupStatus = ref(backupSupported.value ? 'off' : 'unsupported')
  const backupLastSaved = ref(null)

  let handleRef = null
  let backupTimeout = null

  const getData = (dataOrGetter) =>
    typeof dataOrGetter === 'function' ? dataOrGetter() : dataOrGetter

  const writeNow = async (dataOrGetter) => {
    if (!handleRef) return false
    const permission = await queryPermission(handleRef)
    if (permission !== 'granted') {
      autoBackupEnabled.value = false
      backupStatus.value = 'needs-permission'
      return false
    }

    try {
      await writeHandle(handleRef, getData(dataOrGetter))
      backupLastSaved.value = Date.now()
      backupStatus.value = 'connected'
      autoBackupEnabled.value = true
      return true
    } catch (error) {
      console.error('Backup write failed:', error)
      backupStatus.value = 'error'
      return false
    }
  }

  const scheduleBackup = (dataOrGetter) => {
    if (!autoBackupEnabled.value || !handleRef) return
    if (backupTimeout) clearTimeout(backupTimeout)
    backupTimeout = setTimeout(() => {
      backupTimeout = null
      writeNow(dataOrGetter)
    }, BACKUP_DELAY)
  }

  const chooseBackupFile = async (dataOrGetter) => {
    if (!backupSupported.value) {
      return {
        ok: false,
        error: 'This browser cannot write to a file automatically.',
      }
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'little-hanzi-chinese-backup.json',
        types: filePickerTypes,
      })
      const permission = await requestPermission(handle)
      if (permission !== 'granted') {
        return { ok: false, error: 'File permission was not granted.' }
      }
      handleRef = handle
      backupFileName.value = handle.name
      autoBackupEnabled.value = true
      backupStatus.value = 'connected'
      await idbSet(HANDLE_KEY, handle)
      await writeNow(dataOrGetter)
      return { ok: true, fileName: handle.name }
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, canceled: true }
      console.error('Could not choose backup file:', error)
      return {
        ok: false,
        error: error?.message || 'Could not open the file picker.',
      }
    }
  }

  const initBackup = async () => {
    if (!backupSupported.value) {
      backupStatus.value = 'unsupported'
      return
    }
    const handle = await idbGet(HANDLE_KEY)
    if (!handle) {
      backupStatus.value = 'off'
      return
    }
    handleRef = handle
    backupFileName.value = handle.name
    const permission = await queryPermission(handle)
    if (permission === 'granted') {
      autoBackupEnabled.value = true
      backupStatus.value = 'connected'
    } else {
      autoBackupEnabled.value = false
      backupStatus.value = 'needs-permission'
    }
  }

  const reconnectBackup = async (dataOrGetter) => {
    if (!handleRef) {
      return { ok: false, error: 'No backup file is connected. Choose one first.' }
    }
    const permission = await requestPermission(handleRef)
    if (permission !== 'granted') {
      return { ok: false, error: 'File permission was not granted.' }
    }
    autoBackupEnabled.value = true
    backupStatus.value = 'connected'
    await writeNow(dataOrGetter)
    return { ok: true, fileName: handleRef.name }
  }

  const disableBackup = async () => {
    if (backupTimeout) clearTimeout(backupTimeout)
    backupTimeout = null
    handleRef = null
    autoBackupEnabled.value = false
    backupFileName.value = ''
    backupStatus.value = backupSupported.value ? 'off' : 'unsupported'
    backupLastSaved.value = null
    await idbDelete(HANDLE_KEY)
  }

  const downloadBackup = (
    data,
    filename = 'little-hanzi-chinese-backup.json',
  ) => {
    downloadJson(data, filename)
  }

  const pickImportFile = async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: filePickerTypes,
          multiple: false,
        })
        const file = await handle.getFile()
        return { ok: true, name: file.name, text: await file.text() }
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, canceled: true }
        // Some browsers expose the API but block it. Fall through to the
        // classic <input type="file"> picker instead of failing outright.
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      let settled = false

      const cleanup = () => {
        window.removeEventListener('focus', handleWindowFocus)
      }
      const finish = (value) => {
        if (settled) return
        settled = true
        cleanup()
        input.remove()
        resolve(value)
      }
      const handleWindowFocus = () => {
        setTimeout(() => {
          if (!input.files?.length) finish({ ok: false, canceled: true })
        }, 1200)
      }

      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return finish({ ok: false, canceled: true })
        try {
          finish({ ok: true, name: file.name, text: await file.text() })
        } catch {
          finish({ ok: false, error: 'Could not read that file.' })
        }
      }
      input.oncancel = () => finish({ ok: false, canceled: true })
      window.addEventListener('focus', handleWindowFocus)
      document.body.appendChild(input)
      input.click()
    })
  }

  return {
    backupSupported,
    autoBackupEnabled,
    backupFileName,
    backupStatus,
    backupLastSaved,
    initBackup,
    chooseBackupFile,
    reconnectBackup,
    disableBackup,
    scheduleBackup,
    writeNow,
    downloadBackup,
    pickImportFile,
  }
}
