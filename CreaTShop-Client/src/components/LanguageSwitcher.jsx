import React from 'react';
import {useLanguage} from '../i18n/LanguageContext';

const LanguageSwitcher = () => {
	const {language, setLanguage, t} = useLanguage();

	const buttonClass = (value) => (
		`px-2.5 py-1 text-xs font-semibold transition ${
			language === value
				? 'bg-gray-900 text-white'
				: 'bg-white text-gray-700 hover:bg-gray-100'
		}`
	);

	return (
		<div
			className='inline-flex overflow-hidden rounded border border-gray-300'
			aria-label={t('language.switchLabel')}
		>
			<button
				type='button'
				className={buttonClass('vi')}
				aria-pressed={language === 'vi'}
				onClick={() => setLanguage('vi')}
			>
				{t('language.vi')}
			</button>
			<button
				type='button'
				className={buttonClass('en')}
				aria-pressed={language === 'en'}
				onClick={() => setLanguage('en')}
			>
				{t('language.en')}
			</button>
		</div>
	);
};

export default LanguageSwitcher;
