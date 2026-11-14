export function countActiveFilters(filters, defaults = {}) {
    return Object.entries(filters).filter(([key, value]) =>
        String(value ?? '').trim() !== String(defaults[key] ?? '').trim()).length;
}
