import {useRoutes} from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import MainLayout from './layout/MainLayout';
import NotFound from './pages/NotFound';
import AdminDashboard from './layout/AdminDashboard';
import AdminProduct from './components/Admin/AdminProduct';
import AdminOrder from './components/Admin/AdminOrder';
import AdminCategory from './components/Admin/AdminCategory';
import AdminUser from './components/Admin/AdminUser';
import Dashboard from './pages/Dashboard';
import AdminRoute from './components/Admin/AdminRoute';
import Profile from './pages/Profile';
import Shop from './components/Shop/Shop';
import ProductDetail from './components/ProductDetail/ProductDetail';
import Cart from './pages/Cart';
import CheckOut from './pages/CheckOut';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';

function App() {
	const routers = useRoutes([
		{
			path: '/',
			element: <MainLayout />,
			children: [
				{
					path: '',
					element: <Home />,
				},
				{
					path: '/login',
					element: <Login />,
				},
				{
					path: '/signup',
					element: <SignUp />,
				},
				{
					path: '/profile',
					element: <Profile />,
				},
				{
					path: '/shop',
					element: <Shop />,
				},
				{
					path: '/product/:id',
					element: <ProductDetail />,
				},
				{
					path: '/cart',
					element: <Cart />,
				},
				{
					path: '/checkout',
					element: <CheckOut />,
				},
			],
		},
		{
			path: '*',
			element: <NotFound />,
		},
		{
			path: '/admin',
			element: <AdminRoute />,
			children: [
				{
					path: 'dashboard',
					element: <Dashboard />,
				},
				{
					path: 'products',
					element: <AdminProduct />,
				},
				{
					path: 'orders',
					element: <AdminOrder />,
				},
				{
					path: 'categories',
					element: <AdminCategory />,
				},
				{},
				{
					path: 'users',
					element: <AdminUser />,
				},
			],
		},
	]);

	return (
		<>
			<ScrollToTop />
			<Toaster
				position='top-center'
				reverseOrder={false}
				toastOptions={{
					duration: 980,
				}}
				limit={10}
			/>
			{routers}
		</>
	);
}

export default App;
