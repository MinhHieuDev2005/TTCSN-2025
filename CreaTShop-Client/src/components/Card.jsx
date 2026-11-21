import {MdOutlineImageNotSupported} from 'react-icons/md';
import {NavLink} from 'react-router-dom';
import {useState} from 'react';
import PropTypes from 'prop-types';
import {useLanguage} from '../i18n/LanguageContext';

const Card = (props) => {
  const [failedImages, setFailedImages] = useState([]);
  const {t, formatCurrency} = useLanguage();
  const inStock = props.product.variants?.some(variant => variant.quantity > 0);
  const primaryImage = [props.product.imageStaticUrl, props.product.imageDynamicUrl].find(url => url && !failedImages.includes(url));
  const secondaryImage = primaryImage === props.product.imageStaticUrl && props.product.imageDynamicUrl !== primaryImage && !failedImages.includes(props.product.imageDynamicUrl)
    ? props.product.imageDynamicUrl : null;
  const imageFailed = url => setFailedImages(current => current.includes(url) ? current : [...current, url]);

  return (
    <NavLink to={`/product/${props.product.id}`} aria-label={props.product.name} title={props.product.name} className='group card flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-red-600'>
      <div className='relative aspect-square w-full overflow-hidden bg-gray-50'>
        {primaryImage ? <img
          src={primaryImage}
          alt={props.product.name}
          loading='lazy'
          onError={() => imageFailed(primaryImage)}
          className='absolute inset-0 h-full w-full object-contain p-2'
        /> : <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-xs text-gray-500'>
          <MdOutlineImageNotSupported aria-hidden='true' className='text-3xl text-gray-400' />
          <span>{t('product.imageUnavailable')}</span>
        </div>}
        {secondaryImage && <img
          src={secondaryImage}
          alt=''
          aria-hidden='true'
          loading='lazy'
          onError={() => imageFailed(secondaryImage)}
          className='absolute inset-0 h-full w-full bg-gray-50 object-contain p-2 opacity-0 transition-opacity group-hover:opacity-100'
        />}
        {!inStock && <span className='absolute left-3 top-3 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-white/80'>{t('product.outOfStock')}</span>}
      </div>
      <div className='flex flex-1 flex-col p-3 sm:p-4'>
        <h3 className='mb-2 line-clamp-2 h-12 break-words text-sm font-semibold leading-6 text-gray-800 hover:text-red-700 sm:text-base'>{props.product.name}</h3>
        <p className='mt-auto break-words font-bold tabular-nums text-gray-900'>{formatCurrency(props.product.price)}</p>
      </div>
    </NavLink>
  );
};

Card.propTypes = {product: PropTypes.object.isRequired};
export default Card;
