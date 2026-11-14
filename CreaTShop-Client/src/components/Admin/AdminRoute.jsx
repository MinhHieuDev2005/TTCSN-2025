import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../../hook/useAuth';
import toast from 'react-hot-toast';
import SidebarAdmin from '../SideBarAdmin/SidebarAdmin';
import HeaderAdmin from '../../common/HeaderAdmin';
import {useLanguage} from '../../i18n/LanguageContext';

const AdminRoute = () => {
  const { user } = useAuth();
  const {t} = useLanguage();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    if (user && user.roles.includes('ROLE_ADMIN')) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      navigate('/login', { replace: true });
      toast.error(t('admin.unauthorized'));
    }
  }, [user, navigate, t]);

  return isAuthorized ? (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      {/* Sidebar cố định */}
      <SidebarAdmin />

      {/* Nội dung chính với scroll-y */}
      <div className="min-w-0 flex-1 flex flex-col md:ml-[240px] md:overflow-y-auto">
        <HeaderAdmin />
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  ) : null;
};

export default AdminRoute;
