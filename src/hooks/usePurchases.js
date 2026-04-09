import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ── helpers ──────────────────────────────────────────── */
const createStockTx = async (itemId, quantity, type, notes, userId) => {
    if (!itemId || !quantity) return null;
    const { data, error } = await supabase
        .from('transactions')
        .insert([{
            item_id: itemId,
            quantity: Math.abs(quantity),
            type,
            notes: notes || null,
            transaction_date: new Date().toISOString().split('T')[0],
            created_by: userId || null,
        }])
        .select('id')
        .single();
    if (error) { console.error('Stock tx create error:', error); return null; }
    return data?.id || null;
};

const deleteStockTxAndReverseStock = async (stockTxId) => {
    if (!stockTxId) return;
    const { data: tx } = await supabase
        .from('transactions')
        .select('item_id, quantity, type')
        .eq('id', stockTxId)
        .single();
    if (!tx) return;
    await supabase.from('transactions').delete().eq('id', stockTxId);
    // incoming purchase deleted → subtract stock back (-qty)
    const delta = tx.type === 'incoming' ? -Number(tx.quantity) : Number(tx.quantity);
    const { data: item } = await supabase.from('items').select('current_stock').eq('id', tx.item_id).single();
    if (item) {
        await supabase.from('items').update({ current_stock: (Number(item.current_stock) || 0) + delta }).eq('id', tx.item_id);
    }
};

const createLineStockTxs = async (lineItems, type, receiptNote, userId) => {
    const refs = [];
    for (const li of lineItems || []) {
        if (li.item_id && li.quantity) {
            const txId = await createStockTx(li.item_id, li.quantity, type, receiptNote, userId);
            refs.push({ item_id: li.item_id, stock_tx_id: txId });
        }
    }
    return refs;
};

const deleteLineStockTxs = async (stockTxIds) => {
    for (const txId of stockTxIds || []) {
        if (txId) await deleteStockTxAndReverseStock(txId);
    }
};

/* ── hook ─────────────────────────────────────────────── */
export const usePurchases = () => {
    const [purchases, setPurchases] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchPurchases = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .order('transaction_date', { ascending: false })
        if (!error && data) setPurchases(data)
        setLoading(false)
    }, [])

    /* ── addPurchase ──────────────────────────────────── */
    const addPurchase = async (purchaseData, userId) => {
        if (purchaseData.receipt_number) {
            const { data: existing } = await supabase.from('purchases').select('id').eq('receipt_number', purchaseData.receipt_number).single();
            if (existing) return { success: false, error: 'duplicateReceipt' };
        }

        const lineItems = purchaseData.line_items || [];
        const receiptNote = `Achat${purchaseData.receipt_number ? ' #' + purchaseData.receipt_number : ''} (auto)`;

        const { data, error } = await supabase
            .from('purchases')
            .insert([{ ...purchaseData, stock_tx_id: null }])
            .select()
        if (error || !data) return { success: false, error: error?.message }
        const purchase = data[0];

        const txRefs = await createLineStockTxs(lineItems, 'incoming', receiptNote, userId);
        const updatedLineItems = lineItems.map(li => {
            const ref = txRefs.find(r => r.item_id === li.item_id);
            return ref ? { ...li, stock_tx_id: ref.stock_tx_id } : li;
        });
        const firstTxId = txRefs[0]?.stock_tx_id || null;
        if (txRefs.length > 0) {
            await supabase.from('purchases').update({
                stock_tx_id: firstTxId,
                line_items: updatedLineItems,
            }).eq('id', purchase.id);
        }

        await fetchPurchases()
        return { success: true, data: purchase }
    }

    /* ── updatePurchase ───────────────────────────────── */
    const updatePurchase = async (id, purchaseData, userId) => {
        if (purchaseData.receipt_number) {
            const { data: existing } = await supabase.from('purchases').select('id').eq('receipt_number', purchaseData.receipt_number).neq('id', id).single();
            if (existing) return { success: false, error: 'duplicateReceipt' };
        }

        const { data: current } = await supabase
            .from('purchases')
            .select('line_items, stock_tx_id')
            .eq('id', id)
            .single();

        // Reverse all old stock txs
        const oldLineItems = current?.line_items || [];
        const oldTxIds = oldLineItems.map(li => li.stock_tx_id).filter(Boolean);
        if (oldTxIds.length > 0) {
            await deleteLineStockTxs(oldTxIds);
        } else if (current?.stock_tx_id) {
            await deleteStockTxAndReverseStock(current.stock_tx_id);
        }

        // Create new stock txs
        const newLineItems = purchaseData.line_items || [];
        const receiptNote = `Achat${purchaseData.receipt_number ? ' #' + purchaseData.receipt_number : ''} (auto)`;
        const txRefs = await createLineStockTxs(newLineItems, 'incoming', receiptNote, userId);
        const updatedLineItems = newLineItems.map(li => {
            const ref = txRefs.find(r => r.item_id === li.item_id);
            return ref ? { ...li, stock_tx_id: ref.stock_tx_id } : li;
        });
        const firstTxId = txRefs[0]?.stock_tx_id || null;

        const { data, error } = await supabase
            .from('purchases')
            .update({ ...purchaseData, stock_tx_id: firstTxId, line_items: updatedLineItems })
            .eq('id', id)
            .select()

        if (!error && data) {
            await fetchPurchases()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    /* ── deletePurchase ───────────────────────────────── */
    const deletePurchase = async (id) => {
        const { data: current } = await supabase
            .from('purchases')
            .select('line_items, stock_tx_id')
            .eq('id', id)
            .single();

        const { error } = await supabase.from('purchases').delete().eq('id', id)
        if (!error) {
            const oldLineItems = current?.line_items || [];
            const oldTxIds = oldLineItems.map(li => li.stock_tx_id).filter(Boolean);
            if (oldTxIds.length > 0) {
                await deleteLineStockTxs(oldTxIds);
            } else if (current?.stock_tx_id) {
                await deleteStockTxAndReverseStock(current.stock_tx_id);
            }
            setPurchases(prev => prev.filter(p => p.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchPurchases()
    }, [fetchPurchases])

    return { purchases, loading, addPurchase, updatePurchase, deletePurchase, refetch: fetchPurchases }
}
