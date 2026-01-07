import {Field, Form, Formik} from 'formik';
import {loginCheck} from '../utils/loginCheck';
import {Link, useNavigate} from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {login} from '../api/auth.api';
import useAuth from '../hook/useAuth';

const Login = () => {
	const navigate = useNavigate();
	const authen = useAuth();
	return (
		<div className='flex flex-col items-center h-screen'>
			<div className='border border-gray-300 p-16 rounded-lg shadow-lg'>
				<div className='flex flex-col items-center justify-center'>
					<h1 className='text-4xl font-bold mb-4'>Login</h1>
					<Formik
						className='w-full max-w-md'
						initialValues={{
							username: '',
							password: '',
						}}
						validationSchema={loginCheck()}
						onSubmit={async (values) => {
							try {
								const res = await login(values);
								if (res.data.data) {
									const roles = res.data.data.roles;
									const currUser = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
										headers: {
											Authorization: `Bearer ${res.data.data.accessToken}`,
										},
									});
									if (currUser.data.data) {
										authen.saveUser({
											token: res.data.data.accessToken,
											roles: res.data.data.roles,
											idUser: currUser.data.data.id,
											firstName: currUser.data.data.firstName,
											lastName: currUser.data.data.lastName,
											phoneNumber: currUser.data.data.phoneNumber,
											userName: currUser.data.data.userName,
											email: currUser.data.data.email,
										});
										if (roles.includes('ROLE_ADMIN')) {
											window.location.href = '/admin/dashboard';
											navigate('/admin/dashboard');
											toast.success('login as ADMIN');
										} else if (roles.includes('ROLE_USER')) {
											window.location.href = '/';
											navigate('/');
											toast.success('login as USER');
										}
									}
								} else {
									toast.error('Không thấy token, vui lòng thử lại');
								}
							} catch (error) {
							}
						}}
					>
						{({errors, touched}) => (
							<Form>
								<div className='flex flex-col items-center justify-center mt-4 '>
									<Field
										type='text'
										name='username'
										placeholder='Username'
										className='border border-black p-2 rounded-lg'
									/>
									{errors.username && touched.username ? <p className=' text-red-500 '>{errors.username}</p> : null}
									<br />
									<Field
										type='password'
										name='password'
										placeholder='Password'
										className='border border-black p-2 rounded-lg'
									/>
									{errors.password && touched.password ? <p className=' text-red-500 '>{errors.password}</p> : null}
									<br />
									<button
										className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-20 rounded'
										type='submit'
									>
										Login
									</button>
									<p className='text-sm text-gray-500 mt-2'>
										Don't have an account?
										<Link to='/signup' className='text-blue-500 hover:underline'>
											Sign up
										</Link>
									</p>
								</div>
							</Form>
						)}
					</Formik>
				</div>
			</div>
		</div>
	);
};

export default Login;
