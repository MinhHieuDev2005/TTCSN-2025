import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const PaymentReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, fail

    useEffect(() => {
        const verifyPayment = async () => {
            // Get all params from URL
            const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
            // Can add more params verification here or call backend

            try {
                // Option 1: Call Backend to verify (Recommended)
                // const res = await axios.get(`${import.meta.env.VITE_API_URL}/vnpay/return${window.location.search}`);

                // Option 2: Simple Client-side check (Demo purpose)
                if (vnp_ResponseCode === '00') {
                    setStatus('success');
                    toast.success('Thanh toán thành công!');
                    // Optionally redirect to Order History
                    // setTimeout(() => navigate('/my-order'), 3000);
                } else {
                    setStatus('fail');
                    toast.error('Thanh toán thất bại!');
                }
            } catch (error) {
                console.error("Payment verification failed", error);
                setStatus('fail');
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                {status === 'processing' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Đang xử lý thanh toán...</h2>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                    </div>
                )}
                {status === 'success' && (
                    <div className="text-green-600">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <h2 className="text-2xl font-bold mb-2">Thanh toán thành công!</h2>
                        <p className="text-gray-600 mb-6">Cảm ơn bạn đã mua hàng.</p>
                        <button onClick={() => navigate('/')} className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Về trang chủ</button>
                    </div>
                )}
                {status === 'fail' && (
                    <div className="text-red-600">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        <h2 className="text-2xl font-bold mb-2">Thanh toán thất bại!</h2>
                        <p className="text-gray-600 mb-6">Giao dịch không thành công hoặc bị hủy.</p>
                        <button onClick={() => navigate('/checkout')} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Thử lại</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentReturn;
