import {Navigate, Outlet, useLocation} from 'react-router-dom';
import useAuth from '../hook/useAuth';

const CustomerRoute = () => {
	const {user} = useAuth();
	const location = useLocation();
	return user?.token && user.idUser ? <Outlet /> : <Navigate to='/login' replace state={{from: location.pathname + location.search}} />;
};

export default CustomerRoute;
