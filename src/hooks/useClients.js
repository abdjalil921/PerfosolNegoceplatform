import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useClients = () => {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchClients = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true })

        if (!error && data) setClients(data)
        setLoading(false)
    }, [])

    const addClient = async (clientData) => {
        const { data, error } = await supabase
            .from('clients')
            .insert([clientData])
            .select()

        if (!error && data) {
            await fetchClients()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const updateClient = async (id, clientData) => {
        const { data, error } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', id)
            .select()

        if (!error && data) {
            setClients(prev =>
                prev.map(c => c.id === id ? { ...c, ...clientData } : c)
            )
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteClient = async (id) => {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)

        if (!error) {
            setClients(prev => prev.filter(c => c.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

    return { clients, loading, addClient, updateClient, deleteClient, refetch: fetchClients }
}
