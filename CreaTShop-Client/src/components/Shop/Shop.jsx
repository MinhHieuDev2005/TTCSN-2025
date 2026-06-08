import axios from 'axios';
import {useCallback, useEffect, useMemo, useState} from 'react';
import Card from '../Card';
import toast from 'react-hot-toast';
import {useLanguage} from '../../i18n/LanguageContext';
import Pagination from '../Pagination';
import useClientPagination from '../../hook/useClientPagination';

const Shop = () => {
	const [product, setProduct] = useState([]); // Danh sách sản phẩm ban đầu
	const [sortedProducts, setSortedProducts] = useState([]); // Danh sách sản phẩm đã sắp xếp
	const [activeFilter, setActiveFilter] = useState(null);
	const [categories, setCategories] = useState([]);
	const [sortedProductsBySubCate, setSortedProductsBySubCate] = useState([]);
	const {t} = useLanguage();
	const isCategoryFilter = typeof activeFilter === 'number';
	const visibleProducts = useMemo(
		() => isCategoryFilter ? sortedProductsBySubCate : sortedProducts,
		[isCategoryFilter, sortedProducts, sortedProductsBySubCate]
	);
	const {
		currentPage,
		pageSize,
		paginatedItems: currentProducts,
		setCurrentPage,
		setPageSize,
		totalItems,
		totalPages,
	} = useClientPagination(visibleProducts, 12);

	const getAllProduct = useCallback(async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
			setProduct(res.data.data);
			setSortedProducts(res.data.data); // Khởi tạo danh sách sắp xếp
			setCurrentPage(1);
		} catch (error) {
			console.log(error);
		}
	}, [setCurrentPage]);
	const getAllCategory = useCallback(async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
			const allCategories = res.data.data.flatMap((item) => item.categories);
			setCategories(allCategories);
		} catch (err) {
			console.error(err);
			toast.error(t('shop.fetchCategoriesError'));
		}
	}, [t]);

	useEffect(() => {
		getAllProduct();
		getAllCategory();
	}, [getAllProduct, getAllCategory]);

	const sortBySubCateId = async (id) => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories/${id}`);
			setSortedProductsBySubCate(res.data.data.products);
			setActiveFilter(id);
			setCurrentPage(1);
		} catch (err) {
			console.error(err);
			toast.error(t('shop.fetchCategoryProductsError'));
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
		setSortedProductsBySubCate([]);
		setCurrentPage(1);
	};

	return (
		<div className="flex">
			{/* Sidebar */}
			<aside className="w-56 p-4 bg-gray-100 h-screen sticky top-0 overflow-y-auto">
				<h2 className="font-bold mb-2">{t('shop.filters')}</h2>
				{/* Lọc theo giá */}
				<button
					onClick={() => {
						sortProducts('asc');
					}}
					className={`block w-full text-left mb-2 p-2 border rounded
					${activeFilter === 'asc' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
				>
					{t('shop.priceLowHigh')}
				</button>
				<button
					onClick={() => {
						sortProducts('desc');
					}}
					className={`block w-full text-left mb-2 p-2 border rounded
					${activeFilter === 'desc' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
				>
					{t('shop.priceHighLow')}
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
					{visibleProducts.length > 0 ? (
						currentProducts.map((item) => (
							<Card key={item.id} product={item} />
						))
					) : (
						<p>{t('shop.noProducts')}</p>
					)}
				</div>
				<Pagination
					currentPage={currentPage}
					onPageChange={setCurrentPage}
					onPageSizeChange={setPageSize}
					pageSize={pageSize}
					pageSizeOptions={[8, 12, 24, 40]}
					totalItems={totalItems}
					totalPages={totalPages}
				/>
			</div>
		</div>
	);
	
};

export default Shop;
