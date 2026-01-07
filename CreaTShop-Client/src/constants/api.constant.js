export const ApiConstant = {
    auth:{
        login: '/auths/login'
    },
    users:{
        getAllUser: '/users',
        currentUser: '/users/me',
        createUser: '/users',
        updateUser: '/users'
    },
    order:{
        createOrder: '/orders',
        getOrderByCurrentUser: '/orders',
    },
    products:{
        getAllProduct: '/products',
        getProductByProductId: '/products/',
        createProduct: '/products',
        deleteProductByProductId: '/products/',
        updateProductByProductId: '/products/',

    },
    category:{
        createCategory: '/categories',
        getAllCategory: '/categories',
        deleleCategoryByCategoryId: '/categories/',
        updateCategoryByCategoryId: '/categories/',
        getSubCategoryByCategoryId: '/categories/',
    },
    cart:{
        getAllCart: '/carts',
        createCart: '/carts',
        deleteCartByCartItemId: '/carts/',
        updateCartByCartItemId: '/carts/',
        getProductByCartItemId: '/carts/',
    },
    payment:{
        createPayment: '/payments',
        updatePaymentByPaymentId: '/payments/',
    },

    
}