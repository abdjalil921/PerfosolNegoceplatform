import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useTransactions = (itemId = null) => {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchTransactions = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('transactions')
            .select(`
        *,
        items (name, unit),
        profiles (full_name)
      `)
            .order('transaction_date', { ascending: false })

        if (itemId) {
            query = query.eq('item_id', itemId)
        }

        const { data, error } = await query

        if (!error && data) {
            setTransactions(data)
        }
        setLoading(false)
    }, [itemId])

    const createTransaction = async (transactionData) => {
        const { data, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()

        if (!error) {
            await fetchTransactions()
            return { success: true, data: data[0] }
        }
        return { success: false, error }
    }

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    return { transactions, loading, createTransaction, refetch: fetchTransactions }
}
