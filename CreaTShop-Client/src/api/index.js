import axios from 'axios';
import {LocalStorage} from '../constants/localStorage.constant';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	headers: {'Content-Type': 'application/json'},
});
const apiDefault = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	headers: {'Content-Type': 'application/json'},
});
const apiDefaultUpload = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	headers: {'Content-Type': 'multipart/form-data'},
});

for (const client of [api, apiDefaultUpload]) {
	client.interceptors.request.use((config) => {
		const token = JSON.parse(localStorage.getItem(LocalStorage.auth))?.token;
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	});
	client.interceptors.response.use((response) => response.data);
}

export {apiDefault, api, apiDefaultUpload};
