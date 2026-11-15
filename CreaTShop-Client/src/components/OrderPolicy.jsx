import {useLanguage} from '../i18n/LanguageContext';

const OrderPolicy = () => {
	const {t} = useLanguage();
	return (
		<details className="my-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
			<summary className="cursor-pointer rounded-lg px-4 py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700">{t('orderPolicy.title')}</summary>
			<ul className="list-disc space-y-2 px-8 pb-4 leading-6">
				<li>{t('orderPolicy.stock')}</li>
				<li>{t('orderPolicy.cancel')}</li>
				<li>{t('orderPolicy.cod')}</li>
				<li>{t('orderPolicy.vnpay')}</li>
				<li>{t('orderPolicy.support')}</li>
			</ul>
		</details>
	);
};

export default OrderPolicy;
