import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import {BrowserRouter} from 'react-router-dom';
import {Provider} from 'react-redux';
import {store } from './redux/store/index.js'
import {LanguageProvider} from './i18n/LanguageContext.jsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import {api, apiDefault, apiDefaultUpload} from './api/index.js';
import {installUnauthorizedHandler} from './api/unauthorized.js';
import {clear} from './redux/store/auth.store.js';
// import AppCopy from './AppCopy.jsx';

for (const client of [axios, api, apiDefault, apiDefaultUpload]) {
	installUnauthorizedHandler(client, import.meta.env.VITE_API_URL,
		() => store.getState().auth.auth?.token,
		() => {
			store.dispatch(clear());
			toast.error('Phi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng c\u00f2n h\u1ee3p l\u1ec7. Vui l\u00f2ng \u0111\u0103ng nh\u1eadp l\u1ea1i.', {id: 'session-invalid'});
			window.location.assign('/login');
		});
}

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<Provider store={store}>
				<LanguageProvider>
					<App />
				</LanguageProvider>
			</Provider>
		</BrowserRouter>
	</StrictMode>
);
