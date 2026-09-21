import { useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSageSettingsStore } from '../store/sageSettingsStore'
import { getSageConfig } from '../lib/sageClassification'

let inflight = false

const load = async () => {
    if (inflight) return
    inflight = true
    const { data, error } = await supabase
        .from('settings')
        .select('sage_purchase_accounts, sage_classes, sage_combos')
        .eq('id', 1)
        .single()
    inflight = false
    // On error (e.g. the Sage migration is not applied yet) fall back to the
    // documented defaults instead of leaving the pages waiting.
    useSageSettingsStore.getState().setRow(error ? {} : data)
}

/**
 * The comptable's Sage configuration, with the documented fallbacks.
 * `enabled=false` skips the fetch (the Purchases page is used by every role,
 * but only the comptable needs these settings).
 */
export const useSageSettings = (enabled = true) => {
    const row = useSageSettingsStore(s => s.row)
    const loaded = useSageSettingsStore(s => s.loaded)

    useEffect(() => { if (enabled && !loaded) load() }, [enabled, loaded])

    const cfg = useMemo(() => getSageConfig(row), [row])
    return { cfg, loaded }
}

// The settings table's UPDATE policy is admin-only, so the comptable writes
// through this comptable-only RPC (migration 0005).
export const saveSageSettings = async (patch) => {
    const { data, error } = await supabase.rpc('set_sage_settings', { p_patch: patch })
    if (error) return { success: false, error }
    useSageSettingsStore.getState().setRow(data)
    return { success: true, data }
}
