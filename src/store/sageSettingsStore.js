import { create } from 'zustand'

// The comptable's Sage settings (standard ACH accounts, classes, remembered
// combinations). Kept apart from the branding settings store on purpose: it is
// loaded with its own query, so it can never break the logo / company name if
// the Sage migration has not been applied yet.
export const useSageSettingsStore = create((set) => ({
    row: null,
    loaded: false,
    setRow: (row) => set({ row, loaded: true }),
}))
