import axios from 'axios';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hook/useAuth';

const AdminUser = () => {
	const currUser = useAuth();
	const [users, setUsers] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(5);

	const getAllUsers = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
				headers: {
					Authorization: `Bearer ${currUser.user?.token}`,
				},
			});
			setUsers(res.data.data);
			console.log('res User', res.data.data);
		} catch (error) {
			console.error('Error fetching users:', error);
			toast.error('Failed to fetch users.');
		}
	};

	const updateStatus = async (id, isLocked) => {
		try {
			const res = await axios.put(
				`${import.meta.env.VITE_API_URL}/users/${id}?isLocked=${isLocked}`,
				{},
				{
					headers: {
						Authorization: `Bearer ${currUser.user?.token}`,
					},
				}
			);
			console.log('Status updated:', res.data);
			toast.success('User status updated successfully.');
			getAllUsers();
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('Failed to update user status.');
		}
	};

	useEffect(() => {
		getAllUsers();
	}, []);

	// Pagination calculations
	const totalPages = Math.ceil(users.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);

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
				<h1 className='text-2xl font-bold mb-4'>Admin Users</h1>
				{/* Table */}
				<div className='overflow-x-auto shadow-md sm:rounded-lg'>
					<table className='w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400'>
						<thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
							<tr>
								<th scope='col' className='px-6 py-3'>ID</th>
								<th scope='col' className='px-6 py-3'>USERNAME</th>
								<th scope='col' className='px-6 py-3'>Email</th>
								<th scope='col' className='px-6 py-3'>STATUS</th>
							</tr>
						</thead>
						<tbody>
							{currentUsers.map((user, index) => (
								<tr key={user.id}>
									<td className='border px-4 py-2 font-bold'>{indexOfFirstItem + index + 1}</td>
									<td className='border px-4 py-2 font-bold'>{user.username}</td>
									<td className='border px-4 py-2 font-bold'>{user.email}</td>
									<td className='border px-4 py-2 font-bold'>
										<select
											className={`border p-2 rounded ${
												user.status === 'ACTIVE'
													? 'border-green-500 bg-green-500 text-white'
													: 'border-red-500 bg-red-500 text-white'
											}`}
											value={user.status === 'ACTIVE' ? 'false' : 'true'}
											onChange={(e) => updateStatus(user.id, e.target.value === 'true')}
										>
											<option value='true' className='font-bold text-black'>BANNED</option>
											<option value='false' className='font-bold text-black'>ACTIVE</option>
										</select>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className='flex justify-between items-center mt-6'>
					<button
						onClick={handlePrevPage}
						disabled={currentPage === 1}
						className='px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50'
					>
						Previous
					</button>
					<div className='flex space-x-2'>
						{Array.from({ length: totalPages }, (_, index) => (
							<button
								key={index + 1}
								onClick={() => handlePageClick(index + 1)}
								className={`px-4 py-2 rounded-lg ${
									currentPage === index + 1
										? 'bg-blue-500 text-white'
										: 'bg-gray-300 text-gray-700 hover:bg-gray-400'
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
			</div>
		</div>
	);
};

export default AdminUser;