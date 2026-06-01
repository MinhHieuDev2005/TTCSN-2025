import React, {createContext, useContext, useMemo, useState} from 'react';
import {translations} from './translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'creatshop_language';
const SUPPORTED_LANGUAGES = ['vi', 'en'];

const interpolate = (text, params = {}) => (
	String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '')
);

const getInitialLanguage = () => {
	const savedLanguage = localStorage.getItem(STORAGE_KEY);
	return SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : 'vi';
};

export const LanguageProvider = ({children}) => {
	const [language, setLanguageState] = useState(getInitialLanguage);

	const setLanguage = (nextLanguage) => {
		const safeLanguage = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : 'vi';
		setLanguageState(safeLanguage);
		localStorage.setItem(STORAGE_KEY, safeLanguage);
	};

	const value = useMemo(() => {
		const t = (key, params, fallback) => {
			const text = translations[language]?.[key] ?? translations.vi?.[key] ?? fallback ?? key;
			return interpolate(text, params);
		};

		const formatCurrency = (value = 0) => (
			`${Number(value || 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} ${t('common.currency')}`
		);

		const formatDate = (value) => {
			if (!value) return '-';
			return new Date(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
		};

		const orderStatus = (status) => status ? t(`status.order.${status}`, {}, status) : '-';
		const paymentStatus = (status) => status ? t(`status.payment.${status}`, {}, status) : '-';

		return {
			language,
			setLanguage,
			t,
			formatCurrency,
			formatDate,
			orderStatus,
			paymentStatus,
		};
	}, [language]);

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
};

export const useLanguage = () => {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error('useLanguage must be used within LanguageProvider');
	}
	return context;
};
