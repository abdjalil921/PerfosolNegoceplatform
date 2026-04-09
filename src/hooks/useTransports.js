import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useTransports = () => {
    const [routes, setRoutes] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchRoutes = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('transports')
            .select('*')
            .order('date', { ascending: false })

        if (!error && data) setRoutes(data)
        setLoading(false)
    }, [])

    const addRoute = async (payload) => {
        const { data, error } = await supabase
            .from('transports')
            .insert([payload])
            .select()

        if (!error && data) {
            await fetchRoutes()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const updateRoute = async (id, payload) => {
        const { data, error } = await supabase
            .from('transports')
            .update(payload)
            .eq('id', id)
            .select()

        if (!error && data) {
            await fetchRoutes()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteRoute = async (id) => {
        const { error } = await supabase
            .from('transports')
            .delete()
            .eq('id', id)

        if (!error) {
            setRoutes(prev => prev.filter(r => r.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => { fetchRoutes() }, [fetchRoutes])

    return { routes, loading, addRoute, updateRoute, deleteRoute }
}
