import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useBankPayments = () => {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchTransactions = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('bank_payments')
            .select('*')
            .order('transaction_date', { ascending: false })

        if (!error && data) setTransactions(data)
        setLoading(false)
    }, [])

    const addTransaction = async (payload) => {
        const { data, error } = await supabase
            .from('bank_payments')
            .insert([payload])
            .select()
        if (!error && data) { await fetchTransactions(); return { success: true, data: data[0] } }
        return { success: false, error: error?.message }
    }

    const updateTransaction = async (id, payload) => {
        const { data, error } = await supabase
            .from('bank_payments')
            .update(payload)
            .eq('id', id)
            .select()
        if (!error && data) { await fetchTransactions(); return { success: true, data: data[0] } }
        return { success: false, error: error?.message }
    }

    const deleteTransaction = async (id) => {
        const { error } = await supabase.from('bank_payments').delete().eq('id', id)
        if (!error) { setTransactions(prev => prev.filter(t => t.id !== id)); return { success: true } }
        return { success: false, error: error?.message }
    }

    useEffect(() => { fetchTransactions() }, [fetchTransactions])

    return { transactions, loading, addTransaction, updateTransaction, deleteTransaction }
}
