import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cartItems: [],
    cartQuantity: 0, // Số lượng tổng các sản phẩm
    cartTotalAmount: 0,
    cartSubTotal: 0,
  },
  reducers: {
    addToCart: (state, action) => {
      const { productId, variantId, quantity } = action.payload;

      const existingItem = state.cartItems.find(
        (item) => item.productId === productId && item.variantId === variantId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.cartItems.push({ productId, variantId, quantity });
      }

      // Cập nhật tổng số lượng sản phẩm
      state.cartQuantity = state.cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      );
    },
    updateQuantity: (state, action) => {
      const { productId, variantId, quantity } = action.payload;

      const item = state.cartItems.find(
        (cartItem) =>
          cartItem.productId === productId &&
          cartItem.variantId === variantId
      );
      if (item) {
        item.quantity = quantity;
      }

      // Cập nhật tổng số lượng sản phẩm
      state.cartQuantity = state.cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      );
    },
    removeFromCart: (state, action) => {
      const { productId, variantId } = action.payload;
      state.cartItems = state.cartItems.filter(
        (cartItem) =>
          !(cartItem.productId === productId &&
            cartItem.variantId === variantId)
      );

      // Cập nhật tổng số lượng sản phẩm
      state.cartQuantity = state.cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      );
    },
    clearCart: (state) => {
      state.cartItems = [];
      state.cartQuantity = 0;
      state.cartTotalAmount = 0;
      state.cartSubTotal = 0;
    },
    setCartItems: (state, action) => {
      state.cartItems = action.payload;
      state.cartQuantity = action.payload.reduce((total, item) => total + item.quantity, 0);
    },
  },
});

export const { addToCart, updateQuantity, removeFromCart, clearCart, setCartItems } =
  cartSlice.actions;
export default cartSlice.reducer;