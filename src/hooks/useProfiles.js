import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useProfiles = () => {
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchProfiles = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true })

        if (!error && data) setProfiles(data)
        setLoading(false)
    }, [])

    const updateRole = async (userId, newRole) => {
        // Direct update bypasses the set_user_role RPC constraint which doesn't include 'comptable'
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) {
            console.error('updateRole error:', error.message)
            return { success: false, error: error.message }
        }

        setProfiles(prev =>
            prev.map(p => p.id === userId ? { ...p, role: newRole } : p)
        )
        return { success: true }
    }

    const updateProfile = async (userId, updates) => {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (!error) {
            setProfiles(prev =>
                prev.map(p => p.id === userId ? { ...p, ...updates } : p)
            )
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchProfiles()
    }, [fetchProfiles])

    return { profiles, loading, updateRole, updateProfile, refetch: fetchProfiles }
}
