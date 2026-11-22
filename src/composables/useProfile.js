// Local profile used to personalise shares and keep contact details handy.
import { ref, watch } from 'vue'

const STORAGE_KEY = 'littleHanzi_profile'

const clamp = (value, max = 120) =>
  typeof value === 'string' ? value.slice(0, max) : ''

const defaultProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
  occupation: '',
}

function readSavedProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    console.error('Failed to load profile:', error)
    return null
  }
}

export function useProfile() {
  const saved = readSavedProfile()

  const name = ref(clamp(saved?.name, 40))
  const email = ref(clamp(saved?.email, 120))
  const phone = ref(clamp(saved?.phone, 40))
  const address = ref(clamp(saved?.address, 240))
  const occupation = ref(clamp(saved?.occupation, 80))

  const saveProfile = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: name.value,
          email: email.value,
          phone: phone.value,
          address: address.value,
          occupation: occupation.value,
        }),
      )
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  watch([name, email, phone, address, occupation], saveProfile, { deep: true })

  const resetProfile = () => {
    name.value = defaultProfile.name
    email.value = defaultProfile.email
    phone.value = defaultProfile.phone
    address.value = defaultProfile.address
    occupation.value = defaultProfile.occupation
  }

  return {
    name,
    email,
    phone,
    address,
    occupation,
    saveProfile,
    resetProfile,
  }
}

export const profileDefaults = defaultProfile
