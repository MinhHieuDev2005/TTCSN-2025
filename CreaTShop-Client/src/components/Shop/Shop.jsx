import axios from 'axios';
import {useEffect, useState} from 'react';
import Card from '../Card';
import {NavLink} from 'react-router-dom';
import toast from 'react-hot-toast';

const Shop = () => {
	const [product, setProduct] = useState([]); // Danh sách sản phẩm ban đầu
	const [sortedProducts, setSortedProducts] = useState([]); // Danh sách sản phẩm đã sắp xếp
	const [activeFilter, setActiveFilter] = useState(null);
	const [categories, setCategories] = useState([]);
	const [sortedProductsBySubCate, setSortedProductsBySubCate] = useState([]);

	const getAllProduct = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
			console.log('result data', res.data.data);
			setProduct(res.data.data);
			setSortedProducts(res.data.data); // Khởi tạo danh sách sắp xếp
		} catch (error) {
			console.log(error);
		}
	};
	const getAllCategory = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
			const allCategories = res.data.data.flatMap((item) => item.categories);
			setCategories(allCategories);
		} catch (err) {
			console.error(err);
			toast.error('Failed to fetch categories');
		}
	};
	console.log('product', product);
	console.log('cate', categories);

	useEffect(() => {
		getAllProduct();
		getAllCategory();
	}, []);

	const sortBySubCateId = async (id) => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories/${id}`);
			console.log('sandal', res)
			setSortedProductsBySubCate(res.data.data.products);
			setActiveFilter(id);
		} catch (err) {
			console.error(err);
			toast.error('Failed to fetch products for the selected category');
		}
	};

	// Hàm sắp xếp
	const sortProducts = (order) => {
		setActiveFilter(order);
		const sorted = [...product].sort((a, b) => {
			if (order === 'asc') {
				return a.price - b.price; // Sắp xếp giá tăng dần
			} else {
				return b.price - a.price; // Sắp xếp giá giảm dần
			}
		});
		setSortedProducts(sorted);
	};

	return (
		<div className="flex">
			{/* Sidebar */}
			<aside className="w-56 p-4 bg-gray-100 h-screen sticky top-0 overflow-y-auto">
				<h2 className="font-bold mb-2">Filters</h2>
				{/* Lọc theo giá */}
				<button
					onClick={() => {
						sortProducts('asc');
						setSortedProductsBySubCate([]); // Reset danh sách lọc theo danh mục con
					}}
					className={`block w-full text-left mb-2 p-2 border rounded
					${activeFilter === 'asc' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
				>
					Giá: Thấp đến Cao
				</button>
				<button
					onClick={() => {
						sortProducts('desc');
						setSortedProductsBySubCate([]); // Reset danh sách lọc theo danh mục con
					}}
					className={`block w-full text-left mb-2 p-2 border rounded
					${activeFilter === 'desc' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
				>
					Giá: Cao đến Thấp
				</button>
				{/* Lọc theo danh mục con */}
				{categories.map((item, index) => (
					<button
						key={index}
						onClick={() => sortBySubCateId(item.id)}
						className={`block w-full text-left mb-2 p-2 border rounded
						${activeFilter === item.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
					>
						{item.name} - {item.type}
					</button>
				))}
			</aside>
	
			{/* Danh sách sản phẩm */}
			<div className="flex-1 overflow-y-auto h-screen p-4">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{/* Hiển thị danh sách sản phẩm */}
					{(sortedProductsBySubCate.length > 0 ? sortedProductsBySubCate : sortedProducts).length > 0 ? (
						(sortedProductsBySubCate.length > 0 ? sortedProductsBySubCate : sortedProducts).map((item, index) => (
							<Card key={index} product={item} />
						))
					) : (
						<p>No products available</p>
					)}
				</div>
			</div>
		</div>
	);
	
};

export default Shop;
