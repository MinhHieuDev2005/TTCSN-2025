import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import {BrowserRouter} from 'react-router-dom';
import {Provider} from 'react-redux';
import {store } from './redux/store/index.js'
import {LanguageProvider} from './i18n/LanguageContext.jsx';
// import AppCopy from './AppCopy.jsx';

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
