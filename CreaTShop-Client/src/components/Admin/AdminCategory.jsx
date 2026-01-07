import React, {useEffect, useState} from 'react';
import axios from 'axios';
import useAuth from '../../hook/useAuth';
import toast from 'react-hot-toast';

const AdminCategory = () => {
	const currUser = useAuth();
	const [categories, setCategories] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(5);
	const [newCategory, setNewCategory] = useState({name: '', description: '', type: ''});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editCategory, setEditCategory] = useState(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

	useEffect(() => {
		getAllCategory();
	}, []);

	const handleInputChange = (e) => {
		setNewCategory({...newCategory, [e.target.name]: e.target.value});
	};

	const handleEdit = (category) => {
		setEditCategory(category);
		console.log('categoryEdit', category);
		console.log(editCategory);
		setNewCategory({
			name: category.name,
			description: category.description,
			type: category.type,
		});
		setIsModalOpen(true);
	};
	useEffect(() => {
		getAllCategory();
	}, []);
	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			if (editCategory) {
				const res = await axios.put(`${import.meta.env.VITE_API_URL}/categories/${editCategory.id}`, newCategory, {
					headers: {Authorization: `Bearer ${currUser?.user?.token}`},
				});
				setCategories(categories.map((cat) => (cat.id === editCategory.id ? res.data.data : cat)));
				toast.success('Cập nhật thành công');
			} else {
				const res = await axios.post(`${import.meta.env.VITE_API_URL}/categories`, newCategory, {
					headers: {Authorization: `Bearer ${currUser?.user?.token}`},
				});
				setCategories([...categories, res.data.data]);
				toast.success('Thêm thành công');
			}
			setNewCategory({name: '', description: '', type: ''});
			setEditCategory(null);
			setIsModalOpen(false);
		} catch (err) {
			console.error(err);
			toast.error(editCategory ? 'Có lỗi trong việc cập nhật' : 'Có lỗi trong việc tạo ');
		}
	};

	const handleDelete = async (id) => {
		try {
			await axios.delete(`${import.meta.env.VITE_API_URL}/categories/${id}`, {
				headers: {Authorization: `Bearer ${currUser?.user?.token}`},
			});
			setCategories(categories.filter((item) => item.id !== id));
      setIsDeleteOpen(false);
			toast.success('Xóa thành công');
		} catch (err) {
			console.error(err);
			toast.error('Có lỗi khi xóa');
		}
	};

	// Pagination Logic
	const totalPages = Math.ceil(categories.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentCategories = categories.slice(indexOfFirstItem, indexOfLastItem);

	const handleNextPage = () => {
		if (currentPage < totalPages) setCurrentPage(currentPage + 1);
	};

	const handlePrevPage = () => {
		if (currentPage > 1) setCurrentPage(currentPage - 1);
	};

	const handlePageClick = (pageNum) => {
		setCurrentPage(pageNum);
	};

	return (
		<div className=''>
			<div className='container mx-auto p-6'>
				<h1 className='text-2xl font-bold mb-4'>Admin Category</h1>
				<button onClick={() => setIsModalOpen(true)} type='button' className='bg-red-700 p-2 text-white rounded-lg'>
					Thêm danh mục
				</button>
				<div className='p-4'></div>
				{/* Table */}
				<div className='overflow-x-auto shadow-md sm:rounded-lg'>
					<table className='w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400'>
						<thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
							<tr>
								<th scope='col' className='px-6 py-3'>
									ID
								</th>
								<th scope='col' className='px-6 py-3'>
									Name
								</th>
								<th scope='col' className='px-6 py-3'>
									Type
								</th>
								<th scope='col' className='px-6 py-3'>
									Description
								</th>
								<th scope='col' className='px-6 py-3'>
									Action
								</th>
							</tr>
						</thead>
						<tbody>
							{currentCategories.map((category) => (
								<tr key={category.id} className='bg-white border-b dark:bg-gray-800 dark:border-gray-700'>
									<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white'>
										{category.id}
									</td>
									<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white'>
										{category.name}
									</td>
									<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white'>
										{category.type}
									</td>
									<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white'>
										{category.description || 'N/A'}
									</td>
									<td className='px-4 py-2 flex gap-2'> 
										<button
											onClick={() => handleEdit(category)}
											className='font-medium text-blue-600 dark:text-blue-500 hover:underline mr-2'
										>
											Edit
										</button>
										<button
											onClick={() => setIsDeleteOpen(true)}
											className='font-medium text-red-600 dark:text-red-500 hover:underline mr-2'
										>
											Delete
										</button>
                    {/**Modal Delete */}
                    {isDeleteOpen && (
                      <div
                        id='deleteModal'
                        className='fixed inset-0 z-50 flex justify-center items-center w-full h-full bg-slate-700 bg-opacity-10'
                      >
                        <div className='relative p-4 w-full max-w-md h-full md:h-auto'>
                          <div className='relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5'>
                            <button
                              onClick={()=> setIsDeleteOpen(false)}
                              className='text-gray-400 absolute top-2.5 right-2.5 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white'
                            >
                              <svg
                                aria-hidden='true'
                                className='w-5 h-5'
                                fill='currentColor'
                                viewBox='0 0 20 20'
                                xmlns='http://www.w3.org/2000/svg'
                              >
                                <path
                                  fillRule='evenodd'
                                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                                  clipRule='evenodd'
                                ></path>
                              </svg>
                              <span className='sr-only'>Close modal</span>
                            </button>
                            <svg
                              className='text-gray-400 dark:text-gray-500 w-11 h-11 mb-3.5 mx-auto'
                              aria-hidden='true'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                              xmlns='http://www.w3.org/2000/svg'
                            >
                              <path
                                fillRule='evenodd'
                                d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
                                clipRule='evenodd'
                              ></path>
                            </svg>
                            <p className='mb-4 text-gray-500 dark:text-gray-300'>Are you sure you want to delete this category?</p>
                            <div className='flex justify-center items-center space-x-4'>
                              <button
                                onClick={()=>setIsDeleteOpen(false)}
                                className='py-2 px-3 text-sm font-medium text-gray-500 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-primary-300 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600'
                              >
                                No, cancel
                              </button>
                              <button
                                onClick={() => handleDelete(category.id) }
                                className='py-2 px-3 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900'
                              >
                                Yes, I'm sure
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{/* Pagination */}
				<div className='flex justify-between items-center mt-4'>
					<button
						onClick={handlePrevPage}
						disabled={currentPage === 1}
						className='px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50'
					>
						Previous
					</button>
					<div className='flex space-x-2'>
						{Array.from({length: totalPages}, (_, index) => (
							<button
								key={index + 1}
								onClick={() => handlePageClick(index + 1)}
								className={`px-4 py-2 rounded-lg ${
									currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
								}`}
							>
								{index + 1}
							</button>
						))}
					</div>
					<button
						onClick={handleNextPage}
						disabled={currentPage === totalPages}
						className='px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50'
					>
						Next
					</button>
				</div>

				{/* Modal for Add/Edit Category */}
				{isModalOpen && (
					<div className='fixed top-0 left-0 right-0 bottom-0 z-50 flex justify-center items-center w-full md:inset-0 h-full bg-gray-900 bg-opacity-50'>
						<div className='relative p-9 w-full max-w-md max-h-full'>
							<div className='relative bg-white rounded-lg shadow dark:bg-gray-700'>
								<div className='flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600'>
									<h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
										{editCategory ? 'Chỉnh sửa danh mục' : 'Thêm mới danh mục'}
									</h3>
									<button
										onClick={() => setIsModalOpen(false)}
										type='button'
										className='text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white'
									>
										<svg
											className='w-3 h-3'
											aria-hidden='true'
											xmlns='http://www.w3.org/2000/svg'
											fill='none'
											viewBox='0 0 14 14'
										>
											<path
												stroke='currentColor'
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='2'
												d='m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6'
											/>
										</svg>
										<span className='sr-only'>Close modal</span>
									</button>
								</div>
								<form className='p-4 md:p-5' onSubmit={handleSubmit}>
									<div className='grid gap-4 mb-4 grid-cols-2'>
										<div className='col-span-2'>
											<label htmlFor='name' className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>
												Tên danh mục con
											</label>
											<input
												type='text'
												name='name'
												id='name'
												value={newCategory.name}
												onChange={handleInputChange}
												className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500'
												placeholder='Nhập tên danh mục con'
												required=''
											/>
										</div>

										<div className='col-span-2 sm:col-span-1'>
											<label htmlFor='type' className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>
												Loại danh mục cha
											</label>
											<select
												name='type'
												id='type'
												value={newCategory.type}
												onChange={handleInputChange}
												className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500'
											>
												<option value='' disabled>
													Lựa chọn danh mục
												</option>
												<option value='men'>Men</option>
												<option value='women'>Women</option>
												<option value='boy'>Boy</option>
												<option value='girl'>Girl</option>
											</select>
										</div>
										<div className='col-span-2'>
											<label
												htmlFor='description'
												className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
											>
												Mô tả danh mục
											</label>
											<textarea
												id='description'
												name='description'
												value={newCategory.description}
												onChange={handleInputChange}
												rows='4'
												cols='50'
												className=' resize-none block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
												placeholder='Viết mô tả danh mục tại đây'
											></textarea>
										</div>
									</div>
									<button
										type='submit'
										className=' text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
									>
										{editCategory ? 'Cập nhật' : 'Thêm mới'}
									</button>
								</form>
							</div>
						</div>
					</div>
				)}
				
			</div>
		</div>
	);
};

export default AdminCategory;
