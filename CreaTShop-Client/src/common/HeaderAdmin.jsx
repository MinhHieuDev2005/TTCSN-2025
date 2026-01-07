import React, { useReducer } from 'react'
import useAuth from '../hook/useAuth'

const HeaderAdmin = () => {
    const currUser = useAuth()
    const {clearUser} = useAuth()

    const handleLogout = () =>{
        clearUser()
        window.location.href = '/'
      }

    
  return (
    <div className='w-full p-5'>
        <div className=' bg-slate-300 flex justify-between items-center p-2 rounded-lg'>
            <p>Xin chào, {currUser.user.firstName} </p>
            <p>Role: Admin </p>
            <button className=' rounded p-2 border bg-gray-400 hover:bg-gray-600 hover:transition-all hover:duration-300 ' onClick={handleLogout}>
                Logout
            </button>
        </div>
    </div>
  )
}

export default HeaderAdmin