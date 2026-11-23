// Local profile used to personalise shares and keep contact details handy.
import { ref, watch } from 'vue'

const STORAGE_KEY = 'littleHanzi_profile'

const clamp = (value, max = 120) =>
  typeof value === 'string' ? value.slice(0, max) : ''

// Profile photos are stored as resized data URLs. A 256px JPEG is usually a
// few kilobytes, but keep a hard cap so a bad import cannot fill localStorage.
const clampPhoto = (value) =>
  typeof value === 'string' && value.startsWith('data:image/') && value.length <= 400_000
    ? value
    : ''

const defaultProfile = {
  name: '',
  email: '',
  phone: '',
  occupation: '',
  country: '',
  city: '',
  address: '',
  bio: '',
  photo: '',
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

const cleanProfile = (source) => ({
  name: clamp(source?.name, 40),
  email: clamp(source?.email, 120),
  phone: clamp(source?.phone, 40),
  occupation: clamp(source?.occupation, 80),
  country: clamp(source?.country, 60),
  city: clamp(source?.city, 60),
  address: clamp(source?.address, 240),
  bio: clamp(source?.bio, 600),
  photo: clampPhoto(source?.photo),
})

export function useProfile() {
  const saved = readSavedProfile()

  const name = ref(clamp(saved?.name, 40))
  const email = ref(clamp(saved?.email, 120))
  const phone = ref(clamp(saved?.phone, 40))
  const occupation = ref(clamp(saved?.occupation, 80))
  const country = ref(clamp(saved?.country, 60))
  const city = ref(clamp(saved?.city, 60))
  const address = ref(clamp(saved?.address, 240))
  const bio = ref(clamp(saved?.bio, 600))
  const photo = ref(clampPhoto(saved?.photo))

  const saveProfile = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: name.value,
          email: email.value,
          phone: phone.value,
          occupation: occupation.value,
          country: country.value,
          city: city.value,
          address: address.value,
          bio: bio.value,
          photo: photo.value,
        }),
      )
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  // Save immediately: closing the tab right after editing must not lose the
  // profile (especially a freshly uploaded photo).
  watch([name, email, phone, occupation, country, city, address, bio, photo], saveProfile, {
    deep: true,
    flush: 'sync',
  })

  const applyProfile = (next) => {
    const cleaned = cleanProfile(next)
    name.value = cleaned.name
    email.value = cleaned.email
    phone.value = cleaned.phone
    occupation.value = cleaned.occupation
    country.value = cleaned.country
    city.value = cleaned.city
    address.value = cleaned.address
    bio.value = cleaned.bio
    photo.value = cleaned.photo
    saveProfile()
  }

  const resetProfile = () => {
    applyProfile(defaultProfile)
  }

  const snapshot = () => ({
    name: name.value,
    email: email.value,
    phone: phone.value,
    occupation: occupation.value,
    country: country.value,
    city: city.value,
    address: address.value,
    bio: bio.value,
    photo: photo.value,
  })

  return {
    name,
    email,
    phone,
    occupation,
    country,
    city,
    address,
    bio,
    photo,
    saveProfile,
    applyProfile,
    snapshot,
    resetProfile,
  }
}

export const profileDefaults = defaultProfile
