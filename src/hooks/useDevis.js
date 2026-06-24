import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useDevis = () => {
    const [devis, setDevis] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchDevis = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('devis')
            .select('*')
            .order('date', { ascending: false })
        if (!error && data) setDevis(data)
        setLoading(false)
    }, [])

    const addDevis = async (data) => {
        const { data: result, error } = await supabase
            .from('devis')
            .insert([data])
            .select()
        if (error || !result) return { success: false, error: error?.message }
        await fetchDevis()
        return { success: true, data: result[0] }
    }

    const updateDevis = async (id, data) => {
        const { data: result, error } = await supabase
            .from('devis')
            .update(data)
            .eq('id', id)
            .select()
        if (!error && result) {
            await fetchDevis()
            return { success: true, data: result[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteDevis = async (id) => {
        const { error } = await supabase.from('devis').delete().eq('id', id)
        if (!error) {
            setDevis(prev => prev.filter(d => d.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => { fetchDevis() }, [fetchDevis])

    return { devis, loading, addDevis, updateDevis, deleteDevis, refetch: fetchDevis }
}
