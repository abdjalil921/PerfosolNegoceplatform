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

/**
 * Delete a stock transaction record AND manually reverse its effect on current_stock.
 */
const deleteStockTxAndReverseStock = async (stockTxId) => {
    if (!stockTxId) return;
    const { data: tx } = await supabase
        .from('transactions')
        .select('item_id, quantity, type')
        .eq('id', stockTxId)
        .single();
    if (!tx) return;
    await supabase.from('transactions').delete().eq('id', stockTxId);
    const delta = tx.type === 'outgoing' ? Number(tx.quantity) : -Number(tx.quantity);
    const { data: item } = await supabase.from('items').select('current_stock').eq('id', tx.item_id).single();
    if (item) {
        await supabase.from('items').update({ current_stock: (Number(item.current_stock) || 0) + delta }).eq('id', tx.item_id);
    }
};

/** Create stock txs for all line items that have an item_id + quantity, return array of tx ids */
const createLineStockTxs = async (lineItems, type, receiptNote, userId) => {
    const ids = [];
    for (const li of lineItems || []) {
        if (li.item_id && li.quantity) {
            const txId = await createStockTx(li.item_id, li.quantity, type, receiptNote, userId);
            ids.push({ item_id: li.item_id, stock_tx_id: txId });
        }
    }
    return ids; // [{item_id, stock_tx_id}]
};

/** Delete a list of stock_tx_ids (from line_items stored tx refs) */
const deleteLineStockTxs = async (stockTxIds) => {
    for (const txId of stockTxIds || []) {
        if (txId) await deleteStockTxAndReverseStock(txId);
    }
};

/* ── hook ─────────────────────────────────────────────── */
export const useSales = () => {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchSales = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .order('transaction_date', { ascending: false })
        if (!error && data) setSales(data)
        setLoading(false)
    }, [])

    /* ── addSale ──────────────────────────────────────── */
    const addSale = async (saleData, userId) => {
        if (saleData.receipt_number) {
            const { data: existing } = await supabase.from('sales').select('id').eq('receipt_number', saleData.receipt_number).single();
            if (existing) return { success: false, error: 'duplicateReceipt' };
        }

        const lineItems = saleData.line_items || [];
        const receiptNote = `Vente${saleData.receipt_number ? ' #' + saleData.receipt_number : ''} (auto)`;

        const { data, error } = await supabase
            .from('sales')
            .insert([{ ...saleData, stock_tx_id: null }])
            .select()
        if (error || !data) return { success: false, error: error?.message }
        const sale = data[0];

        // Create stock txs for each line item with an inventory item selected
        const txRefs = await createLineStockTxs(lineItems, 'outgoing', receiptNote, userId);

        // Store first stock_tx_id in legacy column, store all in line_items data
        const updatedLineItems = lineItems.map(li => {
            const ref = txRefs.find(r => r.item_id === li.item_id);
            return ref ? { ...li, stock_tx_id: ref.stock_tx_id } : li;
        });
        const firstTxId = txRefs[0]?.stock_tx_id || null;

        if (txRefs.length > 0) {
            await supabase.from('sales').update({
                stock_tx_id: firstTxId,
                line_items: updatedLineItems,
            }).eq('id', sale.id);
        }

        await fetchSales()
        return { success: true, data: sale }
    }

    /* ── updateSale ───────────────────────────────────── */
    const updateSale = async (id, saleData, userId) => {
        if (saleData.receipt_number) {
            const { data: existing } = await supabase.from('sales').select('id').eq('receipt_number', saleData.receipt_number).neq('id', id).single();
            if (existing) return { success: false, error: 'duplicateReceipt' };
        }

        const { data: current } = await supabase
            .from('sales')
            .select('line_items, stock_tx_id')
            .eq('id', id)
            .single();

        // Reverse all old stock txs (from line_items or legacy single tx)
        const oldLineItems = current?.line_items || [];
        const oldTxIds = oldLineItems.map(li => li.stock_tx_id).filter(Boolean);
        if (oldTxIds.length > 0) {
            await deleteLineStockTxs(oldTxIds);
        } else if (current?.stock_tx_id) {
            await deleteStockTxAndReverseStock(current.stock_tx_id);
        }

        // Create new stock txs for new line items
        const newLineItems = saleData.line_items || [];
        const receiptNote = `Vente${saleData.receipt_number ? ' #' + saleData.receipt_number : ''} (auto)`;
        const txRefs = await createLineStockTxs(newLineItems, 'outgoing', receiptNote, userId);

        const updatedLineItems = newLineItems.map(li => {
            const ref = txRefs.find(r => r.item_id === li.item_id);
            return ref ? { ...li, stock_tx_id: ref.stock_tx_id } : li;
        });
        const firstTxId = txRefs[0]?.stock_tx_id || null;

        const { data, error } = await supabase
            .from('sales')
            .update({ ...saleData, stock_tx_id: firstTxId, line_items: updatedLineItems })
            .eq('id', id)
            .select()

        if (!error && data) {
            await fetchSales()
            return { success: true, data: data[0] }
        }
        return { success: false, error: error?.message }
    }

    /* ── deleteSale ───────────────────────────────────── */
    const deleteSale = async (id) => {
        const { data: current } = await supabase
            .from('sales')
            .select('line_items, stock_tx_id')
            .eq('id', id)
            .single();

        const { error } = await supabase.from('sales').delete().eq('id', id)
        if (!error) {
            // Reverse all line item stock txs
            const oldLineItems = current?.line_items || [];
            const oldTxIds = oldLineItems.map(li => li.stock_tx_id).filter(Boolean);
            if (oldTxIds.length > 0) {
                await deleteLineStockTxs(oldTxIds);
            } else if (current?.stock_tx_id) {
                await deleteStockTxAndReverseStock(current.stock_tx_id);
            }
            setSales(prev => prev.filter(s => s.id !== id))
            return { success: true }
        }
        return { success: false, error: error?.message }
    }

    useEffect(() => {
        fetchSales()
    }, [fetchSales])

    return { sales, loading, addSale, updateSale, deleteSale, refetch: fetchSales }
}
