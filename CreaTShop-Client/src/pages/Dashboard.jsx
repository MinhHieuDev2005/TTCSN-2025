import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import useAuth from '../hook/useAuth';
import axios from 'axios';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const [countUser, setCountUser] = useState(0);
  const [countProduct, setCountProduct] = useState(0);
  const [countCategory, setCountCategory] = useState(0);
  const currUser = useAuth();

  const getAllProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
      setCountProduct(res.data.data.length);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const getAllCategory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
      const allCategories = res.data.data.flatMap((item) => item.categories);
      setCountCategory(allCategories.length);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const getAllUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${currUser.user?.token}`,
        },
      });
      setCountUser(res.data.data.length);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    getAllProducts();
    getAllCategory();
    getAllUsers();
  }, []);

  const chartData = {
    labels: ['Users', 'Products', 'Categories'],
    datasets: [
      {
        label: 'Statistics',
        data: [countUser, countProduct, countCategory],
        backgroundColor: ['#4F46E5', '#10B981', '#D946EF'],
        borderColor: ['#312E81', '#065F46', '#9D174D'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-xl font-bold mb-3">Tổng người dùng</h3>
          <p className="text-4xl font-extrabold">{countUser}</p>
          <p className="text-sm mt-2 opacity-75">Active Users</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-xl font-bold mb-3">Tổng sản phẩm</h3>
          <p className="text-4xl font-extrabold">{countProduct}</p>
          <p className="text-sm mt-2 opacity-75">Products Available</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-xl font-bold mb-3">Tổng danh mục</h3>
          <p className="text-4xl font-extrabold">{countCategory}</p>
          <p className="text-sm mt-2 opacity-75">Categories Listed</p>
        </div>
      </div>

      <div className="mt-10 p-5">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-5">
          Dashboard Statistics
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-5">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
