export function apiError(error, fallback) {
    const body = error?.response?.data;
    const details = body?.data;
    const messages = details && typeof details === 'object' ? Object.values(details) : [details];
    return messages.find(value => typeof value === 'string' && value.trim())
        || (typeof body?.meta?.message === 'string' && body.meta.message.trim()) || fallback;
}
