import {apiDefault} from '.';
import {ApiConstant} from '../constants/api.constant';

const authApi = () => ({
	login: async ({password, username}) => {
		return apiDefault.post(ApiConstant.auth.login, {password, username});
	},
});

export const {login} = authApi();

export const socialProviders = signal => apiDefault.get('/auths/social/providers', {signal});
let exchange;
export const completeSocialLogin = () => {
    exchange ??= apiDefault.post('/auths/social/exchange', {}, {withCredentials: true});
    return exchange;
};
