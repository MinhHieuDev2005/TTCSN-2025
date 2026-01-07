import {useSelector, useDispatch} from 'react-redux'
import { clear, save } from '../redux/store/auth.store'

const useAuth = () =>{
    const user = useSelector((state)=>state.auth.auth)
    const dispatch = useDispatch()
    const saveUser = (payload) =>{
        dispatch(save(payload))
    }
    const clearUser = () =>{
        dispatch(clear())
    }
    return {
        user,
        saveUser,
        clearUser
    }
}
export default useAuth