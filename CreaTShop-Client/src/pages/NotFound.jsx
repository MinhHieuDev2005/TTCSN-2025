import {useLanguage} from '../i18n/LanguageContext';

const NotFound = () => {
	const {t} = useLanguage();
	return (
		<div className='not-found '>
			<div className='flex justify-center items-center h-screen'>
					<h1 className='text-center text-danger text-3xl font-bold'><i>{t('notFound.updating')}</i></h1>
			</div>
		</div>
	);
};

export default NotFound;
