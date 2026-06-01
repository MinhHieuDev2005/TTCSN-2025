import React from 'react';
import useAuth from '../hook/useAuth';
import avatar from '../assets/avatar.png'
import { Link } from 'react-router-dom';
import {useLanguage} from '../i18n/LanguageContext';
const Profile = () => {
	const currUser = useAuth();
	const {t} = useLanguage();
	return (
		<div className='h-screen'>
			<div className=''>
				<h1 className='text-4xl font-bold text-center'>{t('profile.title')}</h1>
				<div className=' flex flex-col items-center justify-center p-7'>
					<div className='max-w-xs'>
						<div className='bg-white shadow-xl rounded-lg py-3 w-64'>
							<div className='p-2'>
								<img
									className='w-32 h-32 rounded-full mx-auto'
									src={avatar}
									alt='Avatar'
								/>
							</div>
							<div className='p-2'>
								<h3 className='text-center text-xl text-gray-900 font-medium leading-8'>{currUser.user.firstName}</h3>
								<p className='text-center text-gray-400 text-xs font-semibold'>{currUser.user.roles}</p>
								<table className='text-xs my-3 mx-auto'>
									<tbody>
										<tr>
											<td className='px-2 py-2 text-gray-500 font-semibold'>{t('profile.firstName')}</td>
											<td className='px-2 py-2'>{currUser.user.firstName}</td>
										</tr>
										<tr>
											<td className='px-2 py-2 text-gray-500 font-semibold'>{t('profile.lastName')}</td>
											<td className='px-2 py-2'>{currUser.user.lastName}</td>
										</tr>
										<tr>
											<td className='px-2 py-2 text-gray-500 font-semibold'>{t('profile.phone')}</td>
											<td className='px-2 py-2'>{currUser.user.phoneNumber}</td>
										</tr>
										<tr>
											<td className='px-2 py-2 text-gray-500 font-semibold'>{t('profile.email')}</td>
											<td className='px-2 py-2'>{currUser.user.email}</td>
										</tr>
									</tbody>
								</table>
								<div className='text-center my-3'>
									<Link
										className='text-xs text-indigo-500 italic hover:underline hover:text-indigo-600 font-medium'
										to={'/shop'}
									>
										{t('profile.shopNow')}
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Profile;
