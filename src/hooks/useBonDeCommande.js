import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useBonDeCommande = () => {
    const [bonDeCommande, setBonDeCommande] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchBCs = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('bon_de_commande')
            .select('*')
            .order('date', { ascending: false })
        if (!error && data) setBonDeCommande(data)
        setLoading(false)
    }, [])

    const addBC = async (data) => {
        const { data: result, error } = await supabase
            .from('bon_de_commande')
            .insert([data])
            .select()
        if (error || !result) return { success: false, error: error?.message }
        await fetchBCs()
        return { success: true, data: result[0] }
    }

    const updateBC = async (id, data) => {
        const { data: result, error } = await supabase
            .from('bon_de_commande')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
        if (!error && result) {
            await fetchBCs()
            return { success: true, data: result[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteBC = async (id) => {
        const { error } = await supabase.from('bon_de_commande').delete().eq('id', id)
        if (!error) {
            setBonDeCommande(prev => prev.filter(b => b.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => { fetchBCs() }, [fetchBCs])

    return { bonDeCommande, loading, addBC, updateBC, deleteBC, refetch: fetchBCs }
}
