import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Read session from localStorage synchronously (no network call)
const getLocalSession = () => {
    try {
        const key = Object.keys(localStorage).find(
            k => k.startsWith('sb-') && k.endsWith('-auth-token')
        )
        if (key) {
            const raw = localStorage.getItem(key)
            if (raw) return JSON.parse(raw)
        }
    } catch (_) { }
    return null
}

// Call this ONCE at the top level of App to initialize auth state.
export const useAuthInit = () => {
    const setUser = useAuthStore(s => s.setUser)
    const setProfile = useAuthStore(s => s.setProfile)
    const setLoading = useAuthStore(s => s.setLoading)

    useEffect(() => {
        // Immediately read from localStorage — zero latency
        const localSession = getLocalSession()

        if (localSession?.user) {
            // USER FOUND — set user and resolve loading immediately
            // Do NOT wait for the profile fetch to show the UI
            setUser(localSession.user)
            setLoading(false)

            // Fetch profile in the background (non-blocking)
            supabase
                .from('profiles')
                .select('*')
                .eq('id', localSession.user.id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) setProfile(data)
                })
                .catch(console.error)
        } else {
            // No user in localStorage — not logged in, stop loading
            setLoading(false)
        }

        // Listen for sign-in / sign-out events triggered during the session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null)
                if (!session?.user) {
                    setProfile(null)
                    setLoading(false)
                } else {
                    // On new sign-in, load profile
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()
                        .then(({ data, error }) => {
                            if (!error && data) setProfile(data)
                        })
                        .catch(console.error)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, []) // Empty deps — run exactly once
}

// Use this everywhere else to just read auth state from the store.
export const useAuth = () => useAuthStore(s => s)
