import axios from 'axios';
import React from 'react';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {Link, useParams} from 'react-router-dom';
import useAuth from '../../hook/useAuth';
import {GoArrowLeft} from 'react-icons/go';
import {useLanguage} from '../../i18n/LanguageContext';

const ProductDetail = () => {
	const {id} = useParams();
	const authen = useAuth();
	const [productData, setProductData] = useState(null);
	const [quantity, setQuantity] = useState(1);
	const [existVariants, setExistVariants] = useState([]);
	const [selectedVariantId, setSelectedVariantId] = useState('');
	const {t, formatCurrency} = useLanguage();

	const getProductDetail = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/products/${id}`);
			const {data} = res.data;
			const variants = data.variants?.flat() || [];
			setProductData(data);
			setExistVariants(variants);
			setSelectedVariantId(variants[0]?.id ? String(variants[0].id) : '');
		} catch (err) {
			// console.error('Error fetching product details:', err);
			toast.error(t('product.fetchDetailError'));
		}
	};

	{
		/**tăngg giảm số lượng */
	}
	const handleIncrease = () => {
		setQuantity((prev) => prev + 1);
	};
	const handleDecrease = () => {
		if (quantity > 1) {
			setQuantity((prev) => prev - 1);
		}
	};

	const handleAddToCart = async () => {
		try {
			const selectedVariant = existVariants.find((variant) => String(variant.id) === selectedVariantId);
			if (!selectedVariant) {
				toast.error(t('product.chooseVariantError'));
				return;
			}

			{
				/**Check sản phẩm đã tồn tại hay chưa */
			}
			const cartResponse = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {
				headers: {
					Authorization: `Bearer ${authen?.user?.token}`,
				},
			});

			{
				/**Tìm sản phẩm  */
			}
			const existingItem = cartResponse.data.data.find(
				(item) => item.productResponse.id === productData.id && item.productDetail.id === selectedVariant.id
			);

			if (existingItem) {
				{
					/**Cập nhật số lượng nếu đã tồn tại trong giỏ*/
				}
				const updateItemInCart = await axios.put(
					`${import.meta.env.VITE_API_URL}/carts/${existingItem.id}`,
					{
						productId: productData.id,
						variantId: selectedVariant.id,
						quantity: existingItem.quantity + quantity,
					},
					{
						headers: {
							Authorization: `Bearer ${authen?.user?.token}`,
						},
					}
				);
				toast.success(t('product.cartUpdateSuccess'));
			} else {
				{
					/**thêm sản phẩm nếu chưa tồn tại*/
				}
				const res = await axios.post(
					`${import.meta.env.VITE_API_URL}/carts`,
					{
						productId: productData.id,
						variantId: selectedVariant.id,
						quantity: quantity,
					},
					{
						headers: {
							Authorization: `Bearer ${authen?.user?.token}`,
						},
					}
				);
				toast.success(t('product.cartAddSuccess'));
			}

			setQuantity(1);
		} catch (err) {
			toast.error(err.message || t('product.cartAddError'));
		}
	};

	useEffect(() => {
		getProductDetail();
	}, [id]);

	const selectedVariant = existVariants.find((variant) => String(variant.id) === selectedVariantId);

	return (
		<div className='py-8'>
			<div className='max-w-6xl mx-auto px-4'>
				<div className='bg-white border border-gray-200 rounded-lg shadow-sm p-5 md:p-8'>
					<div className='mb-6'>
						<h1 className='text-3xl font-bold'>{t('product.detailTitle')}</h1>
						<Link to='/shop' className='inline-flex items-center gap-3 mt-2 hover:text-blue-500 transition-colors duration-300'>
							<GoArrowLeft className='animate-pulse' />
							{t('product.returnShop')}
						</Link>
					</div>

					{productData && (
						<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
							<div className='bg-gray-50 rounded-lg border border-gray-100 p-4'>
								<img
									src={productData?.imageStaticUrl}
									alt={productData?.name}
									className='w-full max-h-[520px] object-contain rounded'
								/>
							</div>
							<div>
								<h2 className='text-2xl font-bold'>{productData?.name}</h2>
								<p className='mt-2 text-lg text-gray-700'>{t('product.price')}: {formatCurrency(productData?.price)}</p>

								<div className='mt-6'>
									<h3 className='font-semibold mb-3'>{t('product.chooseVariant')}</h3>
									{existVariants.length > 0 ? (
										<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2'>
											{existVariants.map((item) => {
												const isSelected = String(item.id) === selectedVariantId;
												return (
													<button
														key={item.id}
														type='button'
														onClick={() => setSelectedVariantId(String(item.id))}
														className={`text-left border rounded-lg p-3 transition ${
															isSelected
																? 'border-blue-600 bg-blue-50 text-blue-900'
																: 'border-gray-200 bg-white hover:border-blue-300'
														}`}
													>
														<span className='block font-semibold'>{item.name || `${t('product.size')} ${item.size}`}</span>
														<span className='block text-sm text-gray-600'>
															{t('product.size')}: {item.size || '-'} | {t('product.color')}: {item.color || '-'}
														</span>
														<span className='block text-sm text-gray-600'>
															{t('product.stock')}: {item.quantity ?? '-'}
														</span>
													</button>
												);
											})}
										</div>
									) : (
										<span>{t('product.noVariants')}</span>
									)}
								</div>

								{selectedVariant && (
									<div className='mt-6 rounded-lg border border-gray-200 p-4'>
										<p className='font-medium mb-3'>
											{t('product.selectedVariant')}: {selectedVariant.name || `${t('product.size')} ${selectedVariant.size}`}
										</p>
										<div className='flex flex-col sm:flex-row sm:items-center gap-4'>
											<div className='flex items-center'>
												<button
													onClick={handleDecrease}
													className='bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold h-11 w-11 rounded-l'
												>
													-
												</button>
												<input
													className='border-y border-gray-300 h-11 w-16 text-center'
													value={quantity}
													readOnly
												/>
												<button
													onClick={handleIncrease}
													className='bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold h-11 w-11 rounded-r'
												>
													+
												</button>
											</div>
											<button
												onClick={handleAddToCart}
												disabled={(selectedVariant.quantity ?? 1) <= 0}
												className='bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded disabled:bg-gray-300 disabled:cursor-not-allowed'
											>
												{(selectedVariant.quantity ?? 1) <= 0 ? t('product.outOfStock') : t('product.addToCart')}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProductDetail;
