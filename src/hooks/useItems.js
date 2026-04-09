import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useItems = () => {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchItems = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('name')

        if (!error) setItems(data)
        setLoading(false)
    }, [])

    const addItem = async (itemData) => {
        const { data, error } = await supabase
            .from('items')
            .insert([itemData])
            .select()

        if (!error && data) {
            setItems(prev => [...prev, data[0]])
            return { success: true, data: data[0] }
        }
        return { success: false, error }
    }

    const updateItem = async (id, updates) => {
        const { data, error } = await supabase
            .from('items')
            .update(updates)
            .eq('id', id)
            .select()

        if (!error && data) {
            setItems(prev => prev.map(item => item.id === id ? data[0] : item))
            return { success: true }
        }
        return { success: false, error }
    }

    const deleteItem = async (id) => {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id)

        if (!error) {
            setItems(prev => prev.filter(item => item.id !== id))
            return { success: true }
        }
        return { success: false, error }
    }

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    return { items, loading, addItem, updateItem, deleteItem, refetch: fetchItems }
}
