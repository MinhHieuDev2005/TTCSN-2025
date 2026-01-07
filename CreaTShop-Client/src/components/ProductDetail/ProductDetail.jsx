import axios from 'axios';
import React from 'react';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {Link, useParams} from 'react-router-dom';
import useCart from '../../hook/useCart';
import useAuth from '../../hook/useAuth';
import {GoArrowLeft} from 'react-icons/go';

const ProductDetail = () => {
	const {id} = useParams();
	const myCart = useCart();
	const authen = useAuth();
	const [productData, setProductData] = useState(null);
	const [quantity, setQuantity] = useState(1);
	const [existVariants, setExistVariants] = useState([]);

	const getProductDetail = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/products/${id}`);
			const {data} = res.data;
			setProductData(data);
			console.log('data of product detail', data);
			setExistVariants(data.variants.flat());
			console.log(existVariants);
		} catch (err) {
			// console.error('Error fetching product details:', err);
			toast.error('Failed to fetch product details.');
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
				(item) => item.productResponse.id === productData.id && item.productDetail.id === productData.variants[0].id
			);

			if (existingItem) {
				{
					/**Cập nhật số lượng nếu đã tồn tại trong giỏ*/
				}
				const updateItemInCart = await axios.put(
					`${import.meta.env.VITE_API_URL}/carts/${existingItem.id}`,
					{
						productId: productData.id,
						variantId: productData.variants[0]?.id || 0,
						quantity: existingItem.quantity + quantity,
					},
					{
						headers: {
							Authorization: `Bearer ${authen?.user?.token}`,
						},
					}
				);
				toast.success('Cập nhật giỏ hàng thành công!');
			} else {
				{
					/**thêm sản phẩm nếu chưa tồn tại*/
				}
				const res = await axios.post(
					`${import.meta.env.VITE_API_URL}/carts`,
					{
						productId: productData.id,
						variantId: productData.variants[0]?.id || 0,
						quantity: quantity,
					},
					{
						headers: {
							Authorization: `Bearer ${authen?.user?.token}`,
						},
					}
				);
				toast.success('Thêm vào giỏ hàng thành công!');
			}

			setQuantity(1);
		} catch (err) {
			toast.error(err.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
		}
	};

	useEffect(() => {
		getProductDetail();
	}, []);

	return (
		<div className='h-screen'>
			<div className='container mx-auto px-4'>
				<div className='flex justify-center items-center'>
					<div className='w-1/2 bg-slate-300 p-12'>
						<h1 className='text-3xl font-bold'>Product Detail</h1>
						<Link to='/shop' className='flex items-center gap-3 hover:text-blue-500 transition-colors duration-300'>
							<GoArrowLeft className='animate-pulse' />
							Return Shop
						</Link>

						{productData && (
							<div className='container mx-auto px-4 p-12'>
								<div className='flex justify-between items-center gap-3'>
									<div className='w-1/2'>
										<img
											src={productData?.imageStaticUrl}
											alt={productData?.name}
											className='w-full h-full object-cover'
										/>
									</div>
									<div className='w-1/2'>
										<h2 className='text-2xl font-bold'>{productData?.name}</h2>
										<p className='text-gray-600'>Giá: {(productData?.price).toLocaleString()} VNĐ</p>
										<div className='mt-4'>
											<h2>Variants:</h2>
											{existVariants.length > 0 ? (
												existVariants.map((item, index) => (
													<React.Fragment key={index}>
														<div className='flex gap-4 m-3.5 '>
															<div>
																{' '}
																<b>Size:</b> {item.size}
															</div>
															<div>
																{' '}
																<b>Color:</b> {item.color}
															</div>
														</div>

														<div className='flex items-center'>
															<button
																onClick={handleDecrease}
																className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded'
															>
																-
															</button>
															<input
																className='border border-gray-400 px-2 py-2 w-14 text-center'
																value={quantity}
																readOnly
															/>
															<button
																onClick={handleIncrease}
																className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded'
															>
																+
															</button>
															<button
																onClick={handleAddToCart}
																className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-4'
															>
																Thêm vào giỏ hàng
															</button>
														</div>
													</React.Fragment>
												))
											) : (
												<span>No variants available</span>
											)}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductDetail;
