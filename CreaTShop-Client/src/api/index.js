import axios from 'axios';
import {LocalStorage} from '../constants/localStorage.constant';
import {useNavigate} from 'react-router-dom';
import toast from 'react-hot-toast';
// import useAuth from '../hook/useAuth';

const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_URL}`,
	headers: {
		'Content-Type': 'application/json',
	},
});
api.interceptors.request.use((config) => {
	const accessToken = JSON.parse(localStorage.getItem(LocalStorage.auth))?.token;
	config.headers.Authorization = `Bearer  ${accessToken}`;
	return config;
}, Promise.reject);
api.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      if (error.code === 401) {
        const navigate = useNavigate()
        toast.error('Phiên đăng nhập đã hết hạn')
        navigate('/login')
        localStorage.removeItem(LocalStorage.auth)
      }
      return Promise.reject(error)
    },
  )
  api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.code === 401) {
      const navigate = useNavigate()
      toast.error('Phiên đăng nhập đã hết hạn')
      navigate('/login')
      localStorage.removeItem(LocalStorage.auth)
    }
    return Promise.reject(error)
  },
)

const apiDefault = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
})


// apiDefault.interceptors.request.use(
//   (config) => {
//     const authen = useAuth()
//     const accessToken = authen.user?.token
//     console.log('accessToken',accessToken)

//     config.headers.Authorization = `Bearer  ${LocalStorage.auth?.accessToken}`
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   },
// )
  const apiDefaultUpload = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}`,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  apiDefaultUpload.interceptors.request.use((config) => {
    const accessToken = JSON.parse(localStorage.getItem(LocalStorage.auth))?.token
    config.headers.Authorization = `Bearer  ${accessToken}`
    return config
  }, Promise.reject)
  
  apiDefaultUpload.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      if (error.code === 401) {
        const navigate = useNavigate()
        toast.error('Phiên đăng nhập đã hết hạn')
        navigate('/login')
        localStorage.removeItem(LocalStorage.auth)
      }
      return Promise.reject(error)
    },
  )
  export { apiDefault, api, apiDefaultUpload }