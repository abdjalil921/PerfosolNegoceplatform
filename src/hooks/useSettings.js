import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'

const SETTINGS_CACHE_KEY = 'app_settings_cache'

// Read settings from localStorage synchronously — zero latency, no flash
const getLocalSettings = () => {
    try {
        const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
        if (raw) return JSON.parse(raw)
    } catch (_) {}
    return null
}

// Update the browser favicon dynamically
const updateFavicon = (logoUrl) => {
    if (!logoUrl) return
    try {
        let link = document.querySelector("link[rel~='icon']")
        if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
        }
        link.href = logoUrl
    } catch (_) {}
}

// Update the browser tab title dynamically
const updateTitle = (companyName) => {
    if (!companyName) return
    try {
        document.title = `${companyName} · Gestion`
    } catch (_) {}
}

// Call this ONCE at the App level to load settings from Supabase.
export const useSettingsInit = () => {
    const setSettings = useSettingsStore(s => s.setSettings)

    // ── Step 1: Read from localStorage synchronously (instant, no flash) ──
    const localSettings = getLocalSettings()
    if (localSettings) {
        // Populate the store immediately — before any useEffect runs
        // This is safe to call outside useEffect because Zustand set() is synchronous
        useSettingsStore.getState().setSettings(localSettings)
        updateFavicon(localSettings.logo_url)
        updateTitle(localSettings.company_name)
    }

    useEffect(() => {
        // ── Shared fetch function (called on mount AND after login) ──
        const fetchSettings = () => {
            supabase
                .from('settings')
                .select('logo_url, company_name')
                .eq('id', 1)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        setSettings(data)
                        // Save to localStorage so next load is instant
                        try {
                            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data))
                        } catch (_) {}
                        // Update favicon and title with the fresh values
                        updateFavicon(data.logo_url)
                        updateTitle(data.company_name)
                    }
                })
                .catch(() => {}) // Silently ignore — will retry on SIGNED_IN
        }

        // ── Step 2: Try fetching immediately (works if settings table is public) ──
        fetchSettings()

        // ── Step 3: Re-fetch automatically after successful login ──
        // This handles the case where the settings table requires authentication.
        // Without this, the user would need Ctrl+Shift+R after logging in.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchSettings()
            }
        })

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

// Use this everywhere else to read settings from the store.
export const useSettings = () => useSettingsStore(s => s)
