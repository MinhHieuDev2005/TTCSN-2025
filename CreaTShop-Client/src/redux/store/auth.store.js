import {createSlice} from '@reduxjs/toolkit'
import { LocalStorage } from '../../constants/localStorage.constant'

export const authStore = createSlice({
    name: 'auth',
    initialState: {
        auth: JSON.parse(localStorage.getItem(LocalStorage.auth)) || null,},
        reducers:{
            save: (state, action) => {
                state.auth = action.payload;
                localStorage.setItem(LocalStorage.auth, JSON.stringify(state.auth))},
            clear: (state) => {
                state.auth = null;
                localStorage.removeItem(LocalStorage.auth)
            }
        }
})

export const {save, clear} = authStore.actions
export default authStore.reducer