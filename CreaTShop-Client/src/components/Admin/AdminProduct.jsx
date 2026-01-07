import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import useAuth from "../../hook/useAuth";
import { FileUploader } from "react-drag-drop-files";

const fileTypes = ["JPG", "PNG", "GIF", "JPEG"];

const AdminProduct = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // States for Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    price: "",
    staticImg: null,
    dynamicImg: null,
    categoryId: "",
    variants: [],
  });

  // States for Variant Modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editVariant, setEditVariant] = useState(null);
  const [variantFormData, setVariantFormData] = useState({
    color: "",
    size: "",
    quantity: "",
    image: null,
  });

  // Other states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteVariantId, setDeleteVariantId] = useState(null);

  // Pagination client
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const currUser = useAuth();

  const resetProductForm = () => {
    setProductFormData({
      name: "",
      price: "",
      staticImg: null,
      dynamicImg: null,
      categoryId: "",
      variants: [],
    });
    setEditProduct(null);
  };

  const resetVariantForm = () => {
    setVariantFormData({
      color: "",
      size: "",
      quantity: "",
      image: null,
    });
    setEditVariant(null);
  };

  // Hàm tạo tên variant từ màu sắc
  const generateVariantName = (color, size) => {
    if (color && size) {
      return `${color} - Size ${size}`;
    } else if (color) {
      return color;
    } else if (size) {
      return `Size ${size}`;
    }
    return "Default";
  };

  const getAllProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
      setProducts(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải sản phẩm");
    }
  };

  const getAllCategory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
      const allCategories = res.data.data.flatMap((item) => item.categories || []);
      setCategories(allCategories);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh mục");
    }
  };

  useEffect(() => {
    getAllProducts();
    getAllCategory();
  }, []);

  // ============= PRODUCT EDIT HANDLERS =============
  const handleEditProduct = (product) => {
    setEditProduct(product);
    setProductFormData({
      name: product.name,
      price: product.price,
      categoryId: product.categoryId || product.categories?.[0]?.id || "",
      staticImg: null,
      dynamicImg: null,
      variants: (product.variants || []).map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        quantity: v.quantity,
        image: null,
      })),
    });
    setIsProductModalOpen(true);
  };

  const handleProductInputChange = (e) => {
    const { name, value, type } = e.target;
    setProductFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }));
  };

  const handleProductStaticFileChange = (file) => {
    setProductFormData((prev) => ({ ...prev, staticImg: file }));
  };

  const handleProductDynamicFileChange = (file) => {
    setProductFormData((prev) => ({ ...prev, dynamicImg: file }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", productFormData.name);
      formData.append("price", productFormData.price);
      formData.append("categoryId", productFormData.categoryId);

      if (productFormData.staticImg) formData.append("staticImg", productFormData.staticImg);
      if (productFormData.dynamicImg) formData.append("dynamicImg", productFormData.dynamicImg);

      if (productFormData.variants?.length > 0) {
        productFormData.variants.forEach((variant, index) => {
          formData.append(`variants[${index}].color`, variant.color);
          formData.append(`variants[${index}].size`, variant.size);
          formData.append(`variants[${index}].quantity`, variant.quantity);
          // Tạo tên variant dựa trên màu sắc và size
          formData.append(`variants[${index}].name`, generateVariantName(variant.color, variant.size));
          if (variant.image instanceof File) {
            formData.append(`variants[${index}].image`, variant.image);
          }
        });
      }

      if (editProduct) {
        await axios.put(`${import.meta.env.VITE_API_URL}/products/${editProduct.id}`, formData, {
          headers: {
            Authorization: `Bearer ${currUser?.user?.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/products`, formData, {
          headers: {
            Authorization: `Bearer ${currUser?.user?.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Thêm sản phẩm thành công");
      }

      setIsProductModalOpen(false);
      resetProductForm();
      getAllProducts();
    } catch (err) {
      console.error(err);
      toast.error(editProduct ? "Có lỗi khi cập nhật sản phẩm" : "Có lỗi khi thêm sản phẩm");
    }
  };

  // ============= VARIANT HANDLERS =============
  const handleEditVariant = (variant) => {
    setEditVariant(variant);
    setVariantFormData({
      color: variant.color,
      size: variant.size,
      quantity: variant.quantity,
      image: null,
    });
    setIsVariantModalOpen(true);
  };

  const handleVariantInputChange = (e) => {
    const { name, value, type } = e.target;
    setVariantFormData((prev) => ({ ...prev, [name]: type === "number" ? parseInt(value) : value }));
  };

  const handleVariantFileChange = (file) => {
    setVariantFormData((prev) => ({ ...prev, image: file }));
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("color", variantFormData.color);
      formData.append("size", variantFormData.size);
      formData.append("quantity", variantFormData.quantity);
      // Cập nhật tên variant dựa trên màu sắc và size mới
      formData.append("name", generateVariantName(variantFormData.color, variantFormData.size));
      if (variantFormData.image) formData.append("image", variantFormData.image);

      await axios.put(`${import.meta.env.VITE_API_URL}/variants/${editVariant.id}`, formData, {
        headers: {
          Authorization: `Bearer ${currUser?.user?.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Cập nhật variant thành công");
      setIsVariantModalOpen(false);
      resetVariantForm();
      getAllProducts();
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi khi cập nhật variant");
    }
  };

  const handleDeleteVariant = async (variantId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/variants/${variantId}`, {
        headers: { Authorization: `Bearer ${currUser?.user?.token}` },
      });
      toast.success("Xóa variant thành công");
      setIsDeleteOpen(false);
      setDeleteVariantId(null);
      getAllProducts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.meta?.message || "Có lỗi khi xóa variant");
    }
  };

  const openDeleteModal = (variantId) => {
    setDeleteVariantId(variantId);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteVariantId(null);
    setIsDeleteOpen(false);
  };

  // ============= PAGINATION =============
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem);

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = [];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (start > 2) {
      pages.push("left-ellipsis");
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push("right-ellipsis");
    }
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="font-bold text-3xl">Admin Product</h1>

      <button
        onClick={() => {
          resetProductForm();
          setIsProductModalOpen(true);
        }}
        type="button"
        className="bg-red-700 text-white p-2 rounded-lg mt-4"
      >
        Thêm sản phẩm
      </button>

      <div className="p-4"></div>

      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Sản phẩm</th>
              <th className="px-6 py-3">Variant</th>
              <th className="px-6 py-3">Ảnh</th>
              <th className="px-6 py-3">Giá</th>
              <th className="px-6 py-3">Màu</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">Số lượng</th>
              <th className="px-6 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => {
                const variants = product.variants || [];
                if (variants.length === 0) {
                  return (
                    <tr key={product.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-6 py-4">{product.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {product.name}
                        <div className="mt-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                          >
                            Edit Product
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4" colSpan={7}>Chưa có variant</td>
                    </tr>
                  );
                }
                return variants.map((variant, index) => (
                  <tr key={variant.id || `${product.id}-${index}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4">{variant.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {product.name}
                      {index === 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                          >
                            Edit Product
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {generateVariantName(variant.color, variant.size)}
                    </td>
                    <td className="px-6 py-4">
                      <img
                        src={variant.imageUrl || "/placeholder.png"}
                        alt={variant.name || "variant"}
                        className="w-16 h-16 object-cover rounded"
                      />
                    </td>
                    <td className="px-6 py-4">{product.price || 0} VND</td>
                    <td className="px-6 py-4">{variant.color || "-"}</td>
                    <td className="px-6 py-4">{variant.size || "-"}</td>
                    <td className="px-6 py-4">{variant.quantity || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleEditVariant(variant)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Edit Variant
                        </button>
                        <button
                          onClick={() => openDeleteModal(variant.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })
            ) : (
              <tr>
                <td colSpan={9} className="text-center py-4">Chưa có sản phẩm nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex space-x-1">
            {visiblePages.map((page, idx) => {
              if (typeof page === "string") {
                return (
                  <span key={`${page}-${idx}`} className="px-3 py-2 text-gray-500">
                    ...
                  </span>
                );
              }
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded ${isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      
       {/* ============= PRODUCT MODAL (Create/Edit Product) ============= */}
      {isProductModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex justify-center items-center w-full md:inset-0 h-full bg-gray-900 bg-opacity-50">
          <div className="relative p-6 w-full max-w-4xl max-h-full overflow-auto">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editProduct ? "Cập nhật sản phẩm" : "Thêm mới sản phẩm"}
                </h3>
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    resetProductForm();
                  }}
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                >
                  ✕
                </button>
              </div>
              
              <form className="p-6" onSubmit={handleProductSubmit}>
                {/* Basic Product Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Tên sản phẩm *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={productFormData.name}
                      onChange={handleProductInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Giá *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={productFormData.price}
                      onChange={handleProductInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Danh mục *
                  </label>
                  <select
                    name="categoryId"
                    value={productFormData.categoryId}
                    onChange={handleProductInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Ảnh tĩnh
                    </label>
                    <FileUploader
                      handleChange={handleProductStaticFileChange}
                      name="staticImg"
                      types={fileTypes}
                      maxSize={5}
                    />
                    {productFormData.staticImg && (
                      <img
                        src={URL.createObjectURL(productFormData.staticImg)}
                        alt="preview"
                        className="w-20 h-20 mt-2 object-cover rounded"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Ảnh động
                    </label>
                    <FileUploader
                      handleChange={handleProductDynamicFileChange}
                      name="dynamicImg"
                      types={fileTypes}
                      maxSize={5}
                    />
                    {productFormData.dynamicImg && (
                      <img
                        src={URL.createObjectURL(productFormData.dynamicImg)}
                        alt="preview"
                        className="w-20 h-20 mt-2 object-cover rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Variants Section */}
                {!editProduct && (
                  <div className="variants-section mb-6 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Biến thể sản phẩm</h4>
                    {productFormData.variants?.map((variant, idx) => (
                      <div key={idx} className="border border-gray-100 p-4 mb-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium">Biến thể #{idx + 1}</span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              const updated = [...productFormData.variants];
                              updated.splice(idx, 1);
                              setProductFormData({ ...productFormData, variants: updated });
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <input
                            type="text"
                            placeholder="Màu sắc"
                            value={variant.color}
                            onChange={(e) => {
                              const updated = [...productFormData.variants];
                              updated[idx].color = e.target.value;
                              setProductFormData({ ...productFormData, variants: updated });
                            }}
                            className="p-2 border border-gray-300 rounded"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Kích cỡ"
                            value={variant.size}
                            onChange={(e) => {
                              const updated = [...productFormData.variants];
                              updated[idx].size = e.target.value;
                              setProductFormData({ ...productFormData, variants: updated });
                            }}
                            className="p-2 border border-gray-300 rounded"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Số lượng"
                            value={variant.quantity}
                            onChange={(e) => {
                              const updated = [...productFormData.variants];
                              updated[idx].quantity = e.target.value;
                              setProductFormData({ ...productFormData, variants: updated });
                            }}
                            className="p-2 border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <input
                          type="file"
                          onChange={(e) => {
                            const updated = [...productFormData.variants];
                            updated[idx].image = e.target.files[0];
                            setProductFormData({ ...productFormData, variants: updated });
                          }}
                          className="mb-2"
                        />
                        {variant.image && (
                          <img
                            src={URL.createObjectURL(variant.image)}
                            alt="variant preview"
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        {/* Hiển thị preview tên variant */}
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <strong>Tên variant:</strong> {generateVariantName(variant.color, variant.size)}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      onClick={() => {
                        const variants = productFormData.variants || [];
                        setProductFormData({
                          ...productFormData,
                          variants: [
                            ...variants,
                            { color: "", size: "", quantity: "", image: null },
                          ],
                        });
                      }}
                    >
                      + Thêm biến thể
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700"
                >
                  {editProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============= VARIANT MODAL (Edit Variant Only) ============= */}
      {isVariantModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex justify-center items-center w-full md:inset-0 h-full bg-gray-900 bg-opacity-50">
          <div className="relative p-6 w-full max-w-md max-h-full">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chỉnh sửa Variant
                </h3>
                <button
                  onClick={() => {
                    setIsVariantModalOpen(false);
                    resetVariantForm();
                  }}
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                >
                  ✕
                </button>
              </div>
              
              <form className="p-6" onSubmit={handleVariantSubmit}>
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Màu sắc *
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={variantFormData.color}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Kích cỡ *
                  </label>
                  <input
                    type="text"
                    name="size"
                    value={variantFormData.size}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Số lượng *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={variantFormData.quantity}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Ảnh variant
                  </label>
                  <FileUploader
                    handleChange={handleVariantFileChange}
                    name="variantImage"
                    types={fileTypes}
                    maxSize={5}
                  />
                  {variantFormData.image && (
                    <img
                      src={URL.createObjectURL(variantFormData.image)}
                      alt="preview"
                      className="w-20 h-20 mt-2 object-cover rounded"
                    />
                  )}
                </div>

                {/* Preview tên variant khi edit */}
                <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
                  <strong>Tên variant sẽ là:</strong> {generateVariantName(variantFormData.color, variantFormData.size)}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  Cập nhật Variant
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============= DELETE CONFIRMATION MODAL ============= */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center w-full h-full bg-slate-700 bg-opacity-50">
          <div className="relative p-4 w-full max-w-md h-full md:h-auto">
            <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 absolute top-2.5 right-2.5 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
              <div className="mx-auto mb-4 w-12 h-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="mb-4 text-gray-500 dark:text-gray-300">
                Bạn có chắc chắn muốn xóa variant này không?
              </p>
              <p className="mb-4 text-sm text-gray-400 dark:text-gray-300">
                Nếu đây là variant cuối cùng, sản phẩm cũng sẽ bị xóa!
              </p>
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={closeDeleteModal}
                  className="py-2 px-3 text-sm font-medium text-gray-500 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => handleDeleteVariant(deleteVariantId)}
                  className="py-2 px-3 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
   
};

export default AdminProduct;
