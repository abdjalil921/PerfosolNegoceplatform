import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useCategories = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name')

        if (!error && data) setCategories(data)
        setLoading(false)
    }, [])

    const addCategory = async (name) => {
        const trimmed = name.trim()
        if (!trimmed) return { success: false, error: 'Name cannot be empty' }

        const { data, error } = await supabase
            .from('categories')
            .insert([{ name: trimmed }])
            .select()
            .single()

        if (!error && data) {
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            return { success: true, data }
        }
        return { success: false, error: error?.message }
    }

    const updateCategory = async (id, name) => {
        const trimmed = name.trim()
        if (!trimmed) return { success: false, error: 'Name cannot be empty' }

        const { data, error } = await supabase
            .from('categories')
            .update({ name: trimmed })
            .eq('id', id)
            .select()

        if (!error && data && data.length > 0) {
            setCategories(prev =>
                prev.map(c => c.id === id ? data[0] : c).sort((a, b) => a.name.localeCompare(b.name))
            )
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteCategory = async (id) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)

        if (!error) {
            setCategories(prev => prev.filter(c => c.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetchCategories }
}
