import axios from 'axios';

export const createVNPayPayment = async (amount, token, paymentId) => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/vnpay/create-payment`, {
            params: {
                amount: amount,
                bankCode: 'NCB',
                paymentId,
            },
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined,
            }
        });
        return response.data?.data || response.data;
    } catch (error) {
        console.error('Error creating VNPay payment:', error);
        throw error;
    }
};
