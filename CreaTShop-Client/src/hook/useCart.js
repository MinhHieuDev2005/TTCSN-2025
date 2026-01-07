import {useDispatch, useSelector} from 'react-redux';
import {addToCart, updateQuantity} from '../redux/store/cart.store';
import axios from 'axios';
import {toast} from 'react-hot-toast';
import useAuth from './useAuth';

const useCart = () => {
	const dispatch = useDispatch();
	const cart = useSelector((state) => state.cart.cartItems);
	const authen = useAuth();

	const handleAddToCart = async (productId,variantId, quantity) => {
		dispatch(addToCart({productId, variantId, quantity}));
		const res = axios.post(`${import.meta.env.VITE_API_URL}/carts`,{
				productId: productId,
				variantId: variantId,
				quantity: quantity,
			  }, {
				headers: {
				  Authorization: `Bearer ${authen?.user?.token}`,
				}
			  })
			  console.log('resPostCart', res)
	};

	const updateCartQuantity = (productId, variantId, quantity) => {
		if (quantity < 1) {
			toast.error('Số lượng không thể nhỏ hơn 1.');
			return;
		}

		dispatch(updateQuantity({productId, variantId, quantity}));
	};

	return {
		cart,
		handleAddToCart,
		updateCartQuantity,
	};
};

export default useCart;
