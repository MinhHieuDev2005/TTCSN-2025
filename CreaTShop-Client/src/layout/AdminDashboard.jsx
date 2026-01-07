import React from 'react';
import SidebarAdmin from '../components/SideBarAdmin/SidebarAdmin';
import { Outlet } from 'react-router-dom';

const AdminDashboard = () => {
	return (
		<div className='flex h-full'>
			<SidebarAdmin />
			<div className='flex-1 flex flex-col'>
				<Outlet />
			</div>
		</div>
	);
};

export default AdminDashboard;
