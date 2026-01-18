import axios from "axios";

export const createVNPayPayment = async (amount) => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/vnpay/create-payment`, {
            params: {
                amount: amount,
                bankCode: 'NCB'
            },
            headers: {
                // Include auth header if needed, similar to CheckOut.jsx
                // Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating VNPay payment:", error);
        throw error;
    }
};
