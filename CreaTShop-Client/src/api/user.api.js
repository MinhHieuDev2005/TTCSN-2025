import {api} from '.';
import { ApiConstant } from '../constants/api.constant';
export const currentUser = () => api.get(ApiConstant.users.currentUser);
