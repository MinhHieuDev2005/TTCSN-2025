import useBackgroundRefresh from '../../hook/useBackgroundRefresh';
import SyncNotice from '../SyncNotice';
import Recommendations from '../Recommendations';
import axios from 'axios';
import {useEffect, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {GoArrowLeft} from 'react-icons/go';
import {TbShoppingCartPlus} from 'react-icons/tb';
import {MdOutlineImageNotSupported} from 'react-icons/md';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';

const ProductDetail = () => {
	const {id} = useParams();
	const {user} = useAuth();
	const navigate = useNavigate();
	const {t, formatCurrency} = useLanguage();
	const addingRef = useRef(false);
	const [adding, setAdding] = useState(false);
	const [productData, setProductData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [reload, setReload] = useState(0);
	const [quantity, setQuantity] = useState(1);
	const [color, setColor] = useState('');
	const [size, setSize] = useState('');
	const [image, setImage] = useState('');
	const [failedImages, setFailedImages] = useState([]);

	useEffect(() => {
		if (!user?.token || productData?.id !== Number(id)) return;
		axios.post(`${import.meta.env.VITE_API_URL}/interactions`, {productId: Number(id)},
			{headers: {Authorization: `Bearer ${user.token}`}}).catch(() => {});
	}, [id, productData?.id, user?.token]);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setLoadError(false);
		setProductData(null);
		setQuantity(1);
		setImage('');
		setFailedImages([]);
		axios.get(`${import.meta.env.VITE_API_URL}/products/${id}`, {signal: controller.signal}).then(response => {
			if (controller.signal.aborted) return;
			const data = response.data.data;
			const variants = data.variants?.flat() || [];
			const colors = [...new Set(variants.map(variant => variant.color || ''))];
			setProductData(data);
			setColor(colors.length === 1 ? colors[0] : '');
			setSize(variants.length === 1 ? variants[0].size || '' : '');
		}).catch(() => {
			if (!controller.signal.aborted) setLoadError(true);
		}).finally(() => {
			if (!controller.signal.aborted) setLoading(false);
		});
		return () => controller.abort();
	}, [id, reload]);

	const syncDelayed = useBackgroundRefresh(async signal => {
		const response = await axios.get(`${import.meta.env.VITE_API_URL}/products/${id}`, {signal});
		if (!signal.aborted) { setProductData(response.data.data); setLoadError(false); }
	}, !loading && !adding);

	const variants = productData?.variants?.flat() || [];
	const colors = [...new Set(variants.map(variant => variant.color || ''))];
	const sizes = [...new Set(variants.map(variant => variant.size || ''))];
	const selectedVariant = variants.find(variant => (variant.color || '') === color && (variant.size || '') === size);
	const inStock = variants.some(variant => variant.quantity > 0);
	const canBuy = selectedVariant?.quantity > 0 && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= selectedVariant.quantity;
	const images = [...new Set([productData?.imageStaticUrl, productData?.imageDynamicUrl].filter(url => url && !failedImages.includes(url)))];
	const activeImage = images.includes(image) ? image : images[0];

	const purchase = async buyNow => {
		if (addingRef.current || !canBuy) return;
		if (buyNow) {
			navigate(`/checkout?${new URLSearchParams({buyNow: productData.id, variant: selectedVariant.id, quantity})}`);
			return;
		}
		if (!user?.token) { navigate('/login', {state: {from: `/product/${id}`}}); return; }
		addingRef.current = true;
		setAdding(true);
		try {
			await axios.post(`${import.meta.env.VITE_API_URL}/carts`,
				{productId: productData.id, variantId: selectedVariant.id, quantity},
				{headers: {Authorization: `Bearer ${user.token}`}});
			toast.success(t('product.cartAddSuccess'));
		} catch (error) {
			if (error.response?.status !== 401) toast.error(t('product.cartAddError'));
		} finally {
			addingRef.current = false;
			setAdding(false);
		}
	};

	return (
		<div className='mx-auto max-w-6xl px-4 pb-10'>
			<SyncNotice stale={syncDelayed} />
			<Link to='/shop' className='mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 hover:text-red-700 focus-visible:outline-red-600'>
				<GoArrowLeft aria-hidden='true' />{t('product.returnShop')}
			</Link>
			{loading ? <p role='status'>{t('common.loading')}</p> : loadError ? <div role='alert' className='rounded-xl border p-6'>
				<p>{t('product.fetchDetailError')}</p><button type='button' onClick={() => setReload(value => value + 1)} className='mt-3 min-h-11 underline'>{t('common.retry')}</button>
			</div> : productData && <div className='grid items-start gap-8 lg:grid-cols-2 lg:gap-12'>
				<div>
					<div className='relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4'>
						{activeImage ? <img src={activeImage} alt={productData.name} onError={() => setFailedImages(current => [...current, activeImage])} className='h-full w-full object-contain' />
							: <div className='text-center text-gray-500'><MdOutlineImageNotSupported aria-hidden='true' className='mx-auto mb-3 text-4xl' />{t('product.imageUnavailable')}</div>}
					</div>
					{images.length > 1 && <div className='mt-3 flex gap-3'>
						{images.map((url, index) => <button key={url} type='button' aria-label={t('product.imageNumber', {number: index + 1})} aria-pressed={url === activeImage} onClick={() => setImage(url)} className={`h-20 w-20 overflow-hidden rounded-lg border-2 p-1 focus-visible:outline-red-600 ${url === activeImage ? 'border-red-700' : 'border-gray-200'}`}>
							<img src={url} alt='' onError={() => setFailedImages(current => [...current, url])} className='h-full w-full object-contain' />
						</button>)}
					</div>}
				</div>
				<div className='min-w-0'>
					<h1 className='break-words text-2xl font-bold leading-snug text-gray-900 md:text-3xl'>{productData.name}</h1>
					<p className='mt-5 rounded-xl bg-red-50 px-5 py-4 text-3xl font-bold text-red-700'>{formatCurrency(productData.price)}</p>
					{variants.length > 0 ? <div className='mt-7 space-y-6'>
						<fieldset disabled={adding}>
							<legend className='mb-3 font-semibold'>{t('product.color')}</legend>
							<div className='flex flex-wrap gap-2'>{colors.map(value => <button key={value} type='button' aria-pressed={color === value} disabled={!variants.some(variant => (variant.color || '') === value && variant.quantity > 0)} onClick={() => { setColor(value); setSize(''); setQuantity(1); }} className={`min-h-11 rounded-lg border px-4 py-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:text-gray-400 ${color === value ? 'border-red-700 bg-red-50 text-red-800' : 'border-gray-300 hover:border-gray-500'}`}>
								{value || t('product.standardOption')}
							</button>)}</div>
						</fieldset>
						<fieldset disabled={adding}>
							<legend className='mb-3 font-semibold'>{t('product.size')}</legend>
							<div className='flex flex-wrap gap-2'>{sizes.map(value => <button key={value} type='button' aria-pressed={size === value} disabled={!variants.some(variant => (variant.color || '') === color && (variant.size || '') === value && variant.quantity > 0)} onClick={() => { setSize(value); setQuantity(1); }} className={`min-h-11 min-w-12 rounded-lg border px-4 py-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${size === value ? 'border-red-700 bg-red-50 text-red-800' : 'border-gray-300 hover:border-gray-500'}`}>
								{value || t('product.standardOption')}
							</button>)}</div>
						</fieldset>
						<p role='status' className='text-sm text-gray-600'>{!inStock ? t('product.outOfStock') : selectedVariant ? `${t('product.stock')}: ${selectedVariant.quantity}` : t('product.chooseOptions')}</p>
						<div className='flex flex-wrap items-center gap-4'>
							<span id='product-quantity-label' className='font-semibold'>{t('cart.quantity')}</span>
							<div className='flex rounded-lg border border-gray-300'>
								<button type='button' aria-label={t('product.decreaseQuantity')} disabled={adding || !selectedVariant || quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))} className='h-11 w-11 rounded-l-lg hover:bg-gray-100 disabled:text-gray-300'>-</button>
								<input aria-labelledby='product-quantity-label' className='h-11 w-14 border-x text-center' value={quantity} readOnly />
								<button type='button' aria-label={t('product.increaseQuantity')} disabled={adding || !canBuy || quantity >= selectedVariant.quantity} onClick={() => setQuantity(value => Math.min(selectedVariant.quantity, value + 1))} className='h-11 w-11 rounded-r-lg hover:bg-gray-100 disabled:text-gray-300'>+</button>
							</div>
						</div>
					</div> : <p className='mt-6 text-gray-600'>{t('product.noVariants')}</p>}
					<div className='mt-7 grid gap-3 sm:grid-cols-2'>
						<button type='button' onClick={() => purchase(false)} disabled={adding || !canBuy} className='flex min-h-12 items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-50 px-4 py-3 font-semibold text-red-800 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400'><TbShoppingCartPlus aria-hidden='true' />{t('product.addToCart')}</button>
						<button type='button' onClick={() => purchase(true)} disabled={adding || !canBuy} className='min-h-12 rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500'>{t('product.buyNow')}</button>
					</div>
					{productData.description && <div className='mt-8 border-t pt-5'><h2 className='mb-3 font-semibold'>{t('product.description')}</h2><p className='whitespace-pre-line break-words text-sm leading-7 text-gray-600'>{productData.description}</p></div>}
					<dl className="mt-5 space-y-2">{['material', 'style', 'occasion'].filter(field => productData[field]).map(field =>
						<div key={field}><dt className="font-semibold">{t(`discovery.${field}`)}</dt><dd className="whitespace-pre-line break-words text-gray-600">{productData[field]}</dd></div>
					)}</dl>
				</div>
			</div>}
			{productData?.id === Number(id) && <Recommendations productId={Number(id)} />}
		</div>
	);
};

export default ProductDetail;
