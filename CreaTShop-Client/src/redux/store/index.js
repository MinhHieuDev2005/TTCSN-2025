import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth.store'
import cartReducer from './cart.store'
export const store = configureStore({
  reducer: {
    "auth": authReducer,
    "cart": cartReducer,
  },
})