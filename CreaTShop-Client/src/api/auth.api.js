import toast from 'react-hot-toast';
import {api, apiDefault, apiDefaultUpload} from '.';
import {ApiConstant} from '../constants/api.constant';
import { LocalStorage } from '../constants/localStorage.constant';

const authApi = () => ({
	login: async ({password, username}) => {
		try{
			const res = await apiDefault.post(ApiConstant.auth.login, {password, username});
			return res
		}catch(err){
			const {status, message} = err.response.data.meta	
			toast.error(`${status}-${message}`)
		}
	},
});

export const {login} = authApi();
