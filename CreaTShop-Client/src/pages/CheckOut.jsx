import axios from 'axios';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../hook/useAuth';

const CheckOut = () => {
    const [cartItems, setCartItems] = React.useState([]);
    const [paymentId, setPaymentId] = React.useState(null);
    const [order, setOrder] = React.useState([]);
    const authen = useAuth();

    const getAllCart = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {
                headers: {
                    Authorization: `Bearer ${authen?.user?.token}`,
                },
            });
            setCartItems(res.data.data);
        } catch (error) {
            console.log('err', error.config.data);
            toast.error('Lấy giỏ hàng thất bại!');
        }
    };

    useEffect(() => {
        getAllCart();
        const id = localStorage.getItem('paymentId');
        setPaymentId(id);
    }, []);

    const makeOrder = async () => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/orders`,
                {
                    paymentId: paymentId,
                    orderItem: cartItems.map((item) => ({
                        productId: item.productResponse.id,
                        variantId: item.productDetail.id,
                        quantity: item.quantity,
                    })),
                },
                {
                    headers: {
                        Authorization: `Bearer ${authen?.user?.token}`,
                    },
                }
            );
            setOrder(res.data);
            toast.success('Đặt hàng thành công!');
        } catch (error) {
            console.log(error);
            toast.error('Tính năng sẽ được update sớm nhất ');
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">Checkout</h1>
            <div className="bg-white shadow-md rounded-lg p-5">
                <h2 className="text-xl font-semibold mb-4">Thông tin thanh toán</h2>
                <p className="mb-2">Your Payment ID: <strong>{paymentId}</strong></p>
                
                <h2 className="text-xl font-semibold mt-6 mb-4">Giỏ hàng của bạn</h2>
                {cartItems.length === 0 ? (
                    <p className="text-center">Giỏ hàng của bạn đang trống.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2">Sản phẩm</th>
                                <th className="py-2">Giá</th>
                                <th className="py-2">Số lượng</th>
                                <th className="py-2">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems.map((item) => (
                                <tr key={item.id} className="border-b">
                                    <td className="py-2 flex items-center">
                                        <img src={item.productResponse.imageStaticUrl} alt={item.productDetail.name} className="w-16 h-16 object-cover mr-4" />
                                        <span>{item.productDetail.name}</span>
                                    </td>
                                    <td className="py-2">{item.productResponse.price.toLocaleString()} VNĐ</td>
                                    <td className="py-2">{item.quantity}</td>
                                    <td className="py-2">{(item.productResponse.price * item.quantity).toLocaleString()} VNĐ</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                
                <button onClick={makeOrder} className="w-full mt-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300">
                    Đặt hàng
                </button>
            </div>
        </div>
    );
};

export default CheckOut;