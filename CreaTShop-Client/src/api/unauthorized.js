export function installUnauthorizedHandler(client, apiUrl, getToken, onUnauthorized) {
	const api = new URL(apiUrl, window.location.origin);
	client.interceptors.response.use(undefined, (error) => {
		const token = getToken();
		const config = error.config;
		if (error.response?.status === 401 && token && config?.url) {
			const url = new URL(client.getUri(config), window.location.origin);
			const authorization = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
			if (url.origin === api.origin
				&& (url.pathname === api.pathname || url.pathname.startsWith(`${api.pathname.replace(/\/$/, '')}/`))
				&& authorization === `Bearer ${token}`) {
				onUnauthorized();
			}
		}
		return Promise.reject(error);
	});
}
