import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../../hook/useAuth';
import toast from 'react-hot-toast';
import SidebarAdmin from '../SideBarAdmin/SidebarAdmin';
import HeaderAdmin from '../../common/HeaderAdmin';

const AdminRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    if (user && user.roles.includes('ROLE_ADMIN')) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      navigate('/login', { replace: true });
      toast.error('Bạn không có quyền truy cập trang này');
    }
  }, [user, navigate]);

  return isAuthorized ? (
    <div className="flex h-screen">
      {/* Sidebar cố định */}
      <SidebarAdmin />

      {/* Nội dung chính với scroll-y */}
      <div className="flex-1 ml-[350px] flex flex-col overflow-y-auto">
        <HeaderAdmin />
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  ) : null;
};

export default AdminRoute;
