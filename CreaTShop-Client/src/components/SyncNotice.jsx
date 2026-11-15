import {useLanguage} from '../i18n/LanguageContext';
import PropTypes from 'prop-types';

const SyncNotice = ({stale}) => {
	const {t} = useLanguage();
	return stale ? <p role='status' className='mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>{t('common.syncDelayed')}</p> : null;
};

SyncNotice.propTypes = {stale: PropTypes.bool};
export default SyncNotice;
