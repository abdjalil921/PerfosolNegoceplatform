// Pages that belong to the comptable ONLY — the Sage journals and his settings.
// Nobody else can open or see them, admin included (route guard + sidebar).
export const COMPTABLE_ONLY = ['/comptable-settings', '/sage/achat', '/sage/achat-divers', '/sage/immobilisations'];

export const matchesPath = (pathname, path) => pathname === path || pathname.startsWith(path + '/');
