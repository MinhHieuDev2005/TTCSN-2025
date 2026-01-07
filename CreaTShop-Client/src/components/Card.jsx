import { toast } from 'react-hot-toast';
import { TbShoppingCartPlus } from 'react-icons/tb';
import { MdOutlinePageview } from 'react-icons/md';
import { NavLink, useNavigate } from 'react-router-dom';
import useCart from '../hook/useCart';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../redux/store/cart.store';
import axios from 'axios';
import useAuth from '../hook/useAuth';
import { useState } from 'react';

const Card = (props) => {
  const navigate = useNavigate();
  const cart = useSelector(store => store.cart.cartItems)
  const [quantity, setQuantity] = useState(1)
  const dispatch = useDispatch()
  const authen = useAuth()
  // console.log('cart',cart)

  // Kiểm tra variants
  const hasVariants = props.product.variants?.length > 0;

  // Xử lý thêm sản phẩm vào giỏ hàng
  const handleAddToCart = async () => {
    try {
      // Đầu tiên kiểm tra xem item đã tồn tại trong cart chưa
      const cartResponse = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {
        headers: {
          Authorization: `Bearer ${authen?.user?.token}`
        }
      });
      
      // Tìm item trong cart
      const existingItem = cartResponse.data.data.find(item => 
        item.productResponse.id === props.product.id && 
        item.productDetail.id === props.product.variants[0].id
      );

      if (existingItem) {
        // Nếu item đã tồn tại, chỉ cần update quantity
        const updateItemInCart = await axios.put(
          `${import.meta.env.VITE_API_URL}/carts/${existingItem.id}`,
          {
            productId: props.product.id,
            variantId: props.product.variants[0]?.id || 0,
            quantity: existingItem.quantity + 1
          },
          {
            headers: {
              Authorization: `Bearer ${authen?.user?.token}`
            }
          }
        );
        dispatch(addToCart(updateItemInCart.data.data));
      } else {
        // Nếu item chưa tồn tại, tạo mới
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/carts`,
          {
            productId: props.product.id,
            variantId: props.product.variants[0]?.id || 0,
            quantity: 1
          },
          {
            headers: {
              Authorization: `Bearer ${authen?.user?.token}`
            }
          }
        );
        dispatch(addToCart(res.data.data));
      }

      toast.success('Thêm vào giỏ hàng thành công');
    } catch (err) {
      toast.error(err.message);
    }
};

  // Xử lý xem chi tiết sản phẩm
  const handleViewDetail = () => {
    navigate(`/product/${props.product.id}`);
  };

  return (
    <div className='relative group card border rounded-lg overflow-hidden shadow-lg transition-transform transform hover:scale-105'>
      {/* Hiệu ứng hover chuyển ảnh */}
      <div className='relative w-full h-48'>
        <img
          src={props.product.imageStaticUrl}
          alt={props.product.name}
          className='absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100 group-hover:opacity-0'
        />
        <img
          src={props.product.imageDynamicUrl}
          alt={props.product.name}
          className='absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0 group-hover:opacity-100'
        />
      </div>

      {/* Nội dung sản phẩm */}
      <div className='p-4'>
        <NavLink to={`/product/${props.product.id}`}>
          <h3 className='text-lg font-semibold hover:text-blue-400 hover:duration-700'>{props.product.name}</h3>
        </NavLink>
        <p className='text-gray-700'>{(props.product.price).toLocaleString()} VNĐ</p>
      </div>

      {/* Nút điều khiển */}
      <div className='absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center gap-2 flex-col'>
        {/* Nút thêm vào giỏ hàng */}
        {hasVariants && (
          <button
            onClick={()=>handleAddToCart()}
            className='bg-slate-50 border border-black text-black py-2 px-4 rounded hover:bg-lime-500 hover:text-white hover:transition-all hover:border-white'
          >
            <TbShoppingCartPlus />
          </button>
        )}
        {/* Nút xem chi tiết */}
        <button
          onClick={handleViewDetail}
          className='bg-slate-50 border border-black text-black py-2 px-4 rounded hover:bg-gray-500 hover:text-white hover:transition-all hover:border-white'
        >
          <MdOutlinePageview />
        </button>
      </div>
    </div>
  );
};

export default Card;
