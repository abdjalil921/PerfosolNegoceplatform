import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useCompanies = () => {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchCompanies = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('name', { ascending: true })

        if (!error && data) setCompanies(data)
        setLoading(false)
    }, [])

    const addCompany = async (companyData) => {
        const { data, error } = await supabase
            .from('companies')
            .insert([companyData])
            .select()

        if (!error && data) {
            await fetchCompanies()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const updateCompany = async (id, companyData) => {
        const { data, error } = await supabase
            .from('companies')
            .update(companyData)
            .eq('id', id)
            .select()

        if (!error && data) {
            setCompanies(prev =>
                prev.map(c => c.id === id ? { ...c, ...companyData } : c)
            )
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    const deleteCompany = async (id) => {
        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id)

        if (!error) {
            setCompanies(prev => prev.filter(c => c.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchCompanies()
    }, [fetchCompanies])

    return { companies, loading, addCompany, updateCompany, deleteCompany, refetch: fetchCompanies }
}
