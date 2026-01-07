import {api, apiDefault, apiDefaultUpload} from '.';
import { ApiConstant } from '../constants/api.constant';
import useAuth from '../hook/useAuth';

const userApi = async () => ({
    currentUser: async () => {
        const authen = useAuth()
        try {
            const res = await apiDefault.get(ApiConstant.users.currentUser,{
                headers: {
                    'Authorization': `Bearer ${authen.user.token}`
                }
            });
            console.log('token trong bear',authen.user.token)
            return res
        } catch (error) {
            console.log(error.messsage)
        }
    }

})

export const {currentUser} = userApi();