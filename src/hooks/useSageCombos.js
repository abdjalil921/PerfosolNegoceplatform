import { useCallback } from 'react'
import { useSageSettings, saveSageSettings } from './useSageSettings'
import { addCombo } from '../lib/sageClassification'

// The comptable's remembered HT -> TVA + TTC combinations for one side of the
// books ('purchase' | 'sale'), plus `remember(trio)`: adds a combination the
// list doesn't have yet (a no-op when it is already there). A failed save is
// swallowed on purpose — remembering is a convenience and must never undo or
// fail the invoice classification that triggered it.
export function useSageCombos(side, enabled = true) {
    const { cfg } = useSageSettings(enabled)
    const combos = cfg.combos[side]

    const remember = useCallback(async (trio) => {
        const next = addCombo(combos, trio)
        if (next === combos) return
        await saveSageSettings({ sage_combos: { ...cfg.combos, [side]: next } })
    }, [combos, cfg.combos, side])

    return { cfg, combos, remember }
}
