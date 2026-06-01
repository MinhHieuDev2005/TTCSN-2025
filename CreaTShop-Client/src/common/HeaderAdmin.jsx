import React, { useReducer } from 'react'
import useAuth from '../hook/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import {useLanguage} from '../i18n/LanguageContext'

const HeaderAdmin = () => {
    const currUser = useAuth()
    const {clearUser} = useAuth()
    const {t} = useLanguage()

    const handleLogout = () =>{
        clearUser()
        window.location.href = '/'
      }

    
  return (
    <div className='w-full p-5'>
        <div className=' bg-slate-300 flex justify-between items-center p-2 rounded-lg'>
            <p>{t('nav.greeting', {name: currUser.user.firstName})}</p>
            <p>{t('admin.role')}</p>
            <LanguageSwitcher />
            <button className=' rounded p-2 border bg-gray-400 hover:bg-gray-600 hover:transition-all hover:duration-300 ' onClick={handleLogout}>
                {t('nav.logout')}
            </button>
        </div>
    </div>
  )
}

export default HeaderAdmin
