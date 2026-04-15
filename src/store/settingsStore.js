import { create } from 'zustand'

export const useSettingsStore = create((set) => ({
    logoUrl: null,
    companyName: null,

    setLogoUrl: (logoUrl) => set({ logoUrl }),
    setCompanyName: (companyName) => set({ companyName }),

    setSettings: ({ logo_url, company_name }) => set({
        logoUrl: logo_url ?? null,
        companyName: company_name ?? null,
    }),
}))
