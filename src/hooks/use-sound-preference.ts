'use client'

import { useCallback, useEffect, useState } from 'react'

const SOUND_PREFERENCE_KEY = 'opendeck-sound-enabled'
const SOUND_PREFERENCE_EVENT = 'opendeck:sound-preference'

function readSoundPreference() {
  if (typeof window === 'undefined') return true
  try {
    const saved = window.localStorage.getItem(SOUND_PREFERENCE_KEY)
    return saved === null ? true : saved === '1'
  } catch {
    return true
  }
}

export function useSoundPreference() {
  const [soundEnabled, setSoundEnabledState] = useState(true)

  useEffect(() => {
    const sync = () => setSoundEnabledState(readSoundPreference())

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(SOUND_PREFERENCE_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(SOUND_PREFERENCE_EVENT, sync)
    }
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? '1' : '0')
      window.dispatchEvent(new Event(SOUND_PREFERENCE_EVENT))
    } catch {
      // The in-memory preference still works when browser storage is unavailable.
    }
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(!readSoundPreference())
  }, [setSoundEnabled])

  return { soundEnabled, setSoundEnabled, toggleSound }
}
