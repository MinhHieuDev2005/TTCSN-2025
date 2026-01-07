import React from 'react'

const Loading = () => {
  return (
    <>
        <div className='loading container flex justify-center items-center h-screen'>
            <div className='loader flex justify-center items-center h-40 w-40 rounded-full border-4 border-solid border-gray-400 animate-spin'></div>
        </div>
    </>
  )
}

export default Loading