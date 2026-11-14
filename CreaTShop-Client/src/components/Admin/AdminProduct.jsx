import axios from "axios";
import {FiFilter, FiRotateCcw, FiEdit2, FiEye, FiTrash2} from 'react-icons/fi';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import useAuth from "../../hook/useAuth";
import {useLanguage} from "../../i18n/LanguageContext";

import Pagination from '../Pagination';
import useClientPagination from '../../hook/useClientPagination';
import {selectProductRows} from '../../utils/adminProducts';
import {countActiveFilters} from '../../utils/adminFilters';

const emptyFilters = {query: '', categoryId: '', color: '', size: '', stock: '', minPrice: '', maxPrice: '', sort: 'newest'};

const AdminProduct = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedVariants = selectedProduct?.variants || [];
  const selectedStock = selectedVariants.reduce((total, variant) => total + Number(variant.quantity ?? 0), 0);
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, [selectedProductId]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const productRequest = useRef(0);
  const categoryRequest = useRef(0);
  const [isSaving, setIsSaving] = useState(false);
  const [variantProductId, setVariantProductId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const filterCount = countActiveFilters(filters, emptyFilters);
  const rows = useMemo(() => selectProductRows(products, filters), [products, filters]);
  const {currentPage, pageSize, paginatedItems: currentRows, setCurrentPage, setPageSize, totalItems, totalPages} = useClientPagination(rows, 5);
  const colors = [...new Set(products.flatMap((product) => (product.variants || []).map((variant) => variant.color)).filter(Boolean))].sort();
  const sizes = [...new Set(products.flatMap((product) => (product.variants || []).map((variant) => variant.size)).filter(Boolean))].sort((left, right) => left.localeCompare(right, undefined, {numeric: true}));

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

  const currUser = useAuth();
  const {t, formatCurrency} = useLanguage();

  const [previewUrls, setPreviewUrls] = useState(new Map());
  useEffect(() => {
    const urls = new Map([
      productFormData.staticImg, productFormData.dynamicImg, variantFormData.image,
      ...productFormData.variants.map((variant) => variant.image),
    ].filter((file) => file instanceof File).map((file) => [file, URL.createObjectURL(file)]));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [productFormData.staticImg, productFormData.dynamicImg, productFormData.variants, variantFormData.image]);

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
      return `${color} - ${t('product.size')} ${size}`;
    } else if (color) {
      return color;
    } else if (size) {
      return `${t('product.size')} ${size}`;
    }
    return "Default";
  };

  const getAllProducts = useCallback(async () => {
    const request = ++productRequest.current;
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
      if (request !== productRequest.current) return;
      setFetchError(false);
      setProducts(res.data.data || []);
    } catch (err) {
      if (request !== productRequest.current) return;
      setFetchError(true);
      setProducts([]);
      setSelectedProductId(null);
      console.error(err);
      toast.error(t('adminProduct.fetchProductsError'));
    } finally {
      if (request === productRequest.current) setLoading(false);
    }
  }, [t]);

  const getAllCategory = useCallback(async () => {
    const request = ++categoryRequest.current;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
      if (request !== categoryRequest.current) return;
      setCategoryError(false);
      const allCategories = res.data.data.flatMap((item) => item.categories || []);
      setCategories(allCategories);
    } catch (err) {
      console.error(err);
      if (request !== categoryRequest.current) return;
      setCategoryError(true);
      setCategories([]);
      toast.error(t('adminProduct.fetchCategoriesError'));
    }
  }, [t]);

  useEffect(() => {
    getAllProducts();
    getAllCategory();
    return () => {productRequest.current += 1; categoryRequest.current += 1;};
  }, [getAllProducts, getAllCategory]);

  // ============= PRODUCT EDIT HANDLERS =============
  const handleEditProduct = (product) => {
    setEditProduct(product);
    setProductFormData({
      name: product.name,
      price: product.price,
      categoryId: product.categoryId || product.categories?.[0]?.id || "",
      staticImg: null,
      dynamicImg: null,
      variants: [],
    });
    setIsProductModalOpen(true);
  };

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateImage = (file) => {
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('adminProduct.invalidImage'));
      return false;
    }
    return true;
  };

  const handleProductStaticFileChange = (file) => {
    if (file && !validateImage(file)) return false;
    setProductFormData((prev) => ({ ...prev, staticImg: file }));
  };

  const handleProductDynamicFileChange = (file) => {
    if (file && !validateImage(file)) return false;
    setProductFormData((prev) => ({ ...prev, dynamicImg: file }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (isSaving || fetchError || loading || categoryError) return;
    if (!editProduct && (!productFormData.staticImg || !productFormData.dynamicImg
      || productFormData.variants.some((variant) => !variant.image))) {
      toast.error(t('adminProduct.imagesRequired'));
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", productFormData.name.trim());
      formData.append("price", productFormData.price);
      formData.append("categoryId", productFormData.categoryId);

      if (productFormData.staticImg) formData.append("staticImg", productFormData.staticImg);
      if (productFormData.dynamicImg) formData.append("dynamicImg", productFormData.dynamicImg);

      if (!editProduct && productFormData.variants?.length > 0) {
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
        toast.success(t('adminProduct.updateProductSuccess'));
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/products`, formData, {
          headers: {
            Authorization: `Bearer ${currUser?.user?.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success(t('adminProduct.addProductSuccess'));
      }

      setIsProductModalOpen(false);
      if (!editProduct) setCurrentPage(1);
      resetProductForm();
      await getAllProducts();
    } catch (err) {
      toast.error(errorMessage(err, t('adminProduct.saveProductError')));
    } finally {
      setIsSaving(false);
    }
  };

  // ============= VARIANT HANDLERS =============
  const handleEditVariant = (variant) => {
    setVariantProductId(null);
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
    const { name, value } = e.target;
    setVariantFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariantFileChange = (file) => {
    if (file && !validateImage(file)) return false;
    setVariantFormData((prev) => ({ ...prev, image: file }));
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    if (isSaving || fetchError || loading) return;
    if (!editVariant && !variantFormData.image) {
      toast.error(t('adminProduct.imagesRequired'));
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("color", variantFormData.color);
      formData.append("size", variantFormData.size);
      formData.append("quantity", variantFormData.quantity);
      // Cập nhật tên variant dựa trên màu sắc và size mới
      formData.append("name", generateVariantName(variantFormData.color, variantFormData.size));
      if (variantFormData.image) formData.append("image", variantFormData.image);

      if (editVariant) formData.append('expectedQuantity', editVariant.quantity);
      await axios({
        method: editVariant ? 'put' : 'post',
        url: `${import.meta.env.VITE_API_URL}/variants/${editVariant ? editVariant.id : variantProductId}`,
        data: formData,
        headers: {Authorization: `Bearer ${currUser?.user?.token}`},
      });
      toast.success(t(editVariant ? 'adminProduct.updateVariantSuccess' : 'adminProduct.addVariantSuccess'));
      setIsVariantModalOpen(false);
      resetVariantForm();
      await getAllProducts();
    } catch (err) {
      toast.error(errorMessage(err, t('adminProduct.updateVariantError')));
      await getAllProducts();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (isSaving || fetchError || loading) return;
    setIsSaving(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/variants/${variantId}`, {
        headers: { Authorization: `Bearer ${currUser?.user?.token}` },
      });
      toast.success(t('adminProduct.deleteVariantSuccess'));
      setIsDeleteOpen(false);
      setDeleteVariantId(null);
      await getAllProducts();
    } catch (err) {
      toast.error(errorMessage(err, t('adminProduct.deleteVariantError')));
    } finally {
      setIsSaving(false);
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

  const changeFilter = (name, value) => {
    setFilters((previous) => ({...previous, [name]: value}));
    setCurrentPage(1);
  };
  const errorMessage = (error, fallback) => {
    const response = error.response?.data;
    return response?.data && typeof response.data === 'object'
      ? Object.values(response.data).join(', ') : response?.meta?.message || fallback;
  };
  const openCreateVariant = (productId) => {
    resetVariantForm();
    setVariantProductId(productId);
    setIsVariantModalOpen(true);
  };

  return (
    <div className="w-full min-w-0 p-2 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          {selectedProduct && <button type="button" disabled={isSaving} onClick={() => setSelectedProductId(null)} className="mb-2 text-sm text-blue-700 underline disabled:opacity-50">{t('adminProduct.backToProducts')}</button>}
          <h1 ref={headingRef} tabIndex={-1} className="font-bold text-2xl break-words">{selectedProduct ? selectedProduct.name : t('adminProduct.title')}</h1>
        </div>
        <div className="flex gap-2">
          {!selectedProduct && <button type="button" aria-label={t('common.filters')} aria-expanded={showFilters} aria-controls="admin-products-filters" onClick={() => setShowFilters(value => !value)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><FiFilter aria-hidden="true" />{t('common.filters')}{filterCount > 0 && <span aria-hidden="true" className="rounded-full bg-blue-100 px-2 text-xs text-blue-800">{filterCount}</span>}</button>}
          {!selectedProduct && <button type="button" disabled={isSaving || loading || fetchError || categoryError} onClick={() => {resetProductForm(); setIsProductModalOpen(true);}} className="bg-blue-700 text-white px-4 py-2 rounded">{t('adminProduct.add')}</button>}
        </div>
      </div>
      {filterCount > 0 && <p role="status" className="mb-3 text-sm text-blue-800">{t('common.activeFilters', {count: filterCount})}</p>}
      {fetchError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"><p>{t('adminProduct.fetchProductsError')}</p><button type="button" disabled={loading} onClick={getAllProducts} className="min-h-11 rounded-lg border border-red-300 px-4 py-2 font-medium disabled:opacity-50">{t('common.retry')}</button></div>}
      {categoryError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"><p>{t('adminProduct.fetchCategoriesError')}</p><button type="button" onClick={getAllCategory} className="min-h-11 rounded-lg border border-red-300 px-4 py-2 font-medium">{t('common.retry')}</button></div>}
      {selectedProduct ? <div className="space-y-6" aria-busy={loading}>
        <section aria-labelledby="product-overview-title" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 id="product-overview-title" className="text-lg font-semibold">{t('adminProduct.generalInfo')}</h2>
            <button type="button" disabled={isSaving || loading} aria-label={t('adminProduct.editProduct')} title={t('adminProduct.editProduct')} onClick={() => handleEditProduct(selectedProduct)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiEdit2 size={20} aria-hidden="true" focusable="false" /></button>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {selectedProduct.imageStaticUrl && <img src={selectedProduct.imageStaticUrl} alt={selectedProduct.name} className="h-32 w-32 shrink-0 rounded bg-gray-50 object-contain" />}
            <div className="min-w-0 flex-1">
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div><dt className="text-gray-500">{t('adminProduct.productId')}</dt><dd className="mt-1 font-medium">#{selectedProduct.id}</dd></div>
                <div><dt className="text-gray-500">{t('admin.categories')}</dt><dd className="mt-1 font-medium break-words">{categories.find((category) => category.id === selectedProduct.categoryId)?.name || '-'}</dd></div>
                <div><dt className="text-gray-500">{t('adminProduct.price')}</dt><dd className="mt-1 font-medium">{formatCurrency(selectedProduct.price)}</dd></div>
                <div><dt className="text-gray-500">{t('adminProduct.totalStock')}</dt><dd className="mt-1 font-medium">{selectedStock}</dd></div>
              </dl>
              <p className="mt-4 text-sm text-gray-500">{t('adminProduct.sharedPriceHint')}</p>
            </div>
          </div>
        </section>
        <section aria-labelledby="product-variants-title" className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
            <div><h2 id="product-variants-title" className="text-lg font-semibold">{t('adminProduct.variantsSection')} ({selectedVariants.length})</h2><p className="mt-1 text-sm text-gray-500">{t('adminProduct.allVariantsHint')}</p></div>
            <button type="button" disabled={isSaving || loading} onClick={() => openCreateVariant(selectedProduct.id)} className="bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50">{t('adminProduct.addVariant')}</button>
          </div>
          {selectedVariants.length === 0 ? <p className="border-t p-8 text-center text-sm text-gray-500">{t('adminProduct.noVariant')}</p> : <div className="overflow-x-auto" role="region" aria-label={t('adminProduct.variantsSection')} tabIndex={0}>
            <table className="w-full min-w-[640px] text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase"><tr>
                <th scope="col" className="p-3">{t('adminProduct.variantId')}</th><th scope="col" className="p-3">{t('adminProduct.image')}</th><th scope="col" className="p-3">{t('adminProduct.color')}</th><th scope="col" className="p-3">{t('adminProduct.size')}</th><th scope="col" className="p-3">{t('adminProduct.stock')}</th><th scope="col" className="p-3">{t('common.actions')}</th>
              </tr></thead>
              <tbody>{selectedVariants.map((variant) => <tr key={variant.id} className="border-t align-middle hover:bg-gray-50">
                  <td className="p-3">#{variant.id}</td>
                  <td className="p-3">{variant.imageUrl ? <img src={variant.imageUrl} alt="" loading="lazy" className="h-12 w-12 object-contain rounded bg-gray-50" /> : '-'}</td>
                  <td className="p-3 break-words">{variant.color}</td><td className="p-3 break-words">{variant.size}</td>
                  <td className="p-3"><span className={`inline-block px-2 py-1 text-xs rounded ${!variant.quantity ? 'bg-red-100 text-red-700' : variant.quantity <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{variant.quantity ?? 0}</span></td>
                  <td className="p-3"><div className="flex flex-wrap gap-2">
                    <button type="button" disabled={isSaving || loading} aria-label={`${t('adminProduct.editVariant')}: ${variant.color} / ${variant.size} (#${variant.id})`} title={`${t('adminProduct.editVariant')}: ${variant.color} / ${variant.size} (#${variant.id})`} onClick={() => handleEditVariant(variant)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiEdit2 size={20} aria-hidden="true" focusable="false" /></button>
                    <button type="button" disabled={isSaving || loading} aria-label={`${t('adminProduct.deleteVariant')}: ${variant.color} / ${variant.size} (#${variant.id})`} title={`${t('adminProduct.deleteVariant')}: ${variant.color} / ${variant.size} (#${variant.id})`} onClick={() => openDeleteModal(variant.id)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiTrash2 size={20} aria-hidden="true" focusable="false" /></button>
                  </div></td>
                </tr>)}</tbody>
            </table>
          </div>}
        </section>
      </div> : <>
      <section id="admin-products-filters" hidden={!showFilters} aria-label={t('common.filters')} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.search')}</span><input type="search" value={filters.query} onChange={(event) => changeFilter('query', event.target.value)} placeholder={t('adminProduct.searchPlaceholder')} className="w-full border rounded px-3 py-2" /></label>
        <label className="text-sm"><span className="block mb-1">{t('admin.categories')}</span><select aria-label={t('admin.categories')} value={filters.categoryId} onChange={(event) => changeFilter('categoryId', event.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="">{t('adminProduct.allCategories')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.color')}</span><select aria-label={t('adminProduct.color')} value={filters.color} onChange={(event) => changeFilter('color', event.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="">{t('adminProduct.allColors')}</option>{colors.map((color) => <option key={color}>{color}</option>)}</select></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.size')}</span><select aria-label={t('adminProduct.size')} value={filters.size} onChange={(event) => changeFilter('size', event.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="">{t('adminProduct.allSizes')}</option>{sizes.map((size) => <option key={size}>{size}</option>)}</select></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.stock')}</span><select aria-label={t('adminProduct.stock')} value={filters.stock} onChange={(event) => changeFilter('stock', event.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="">{t('orders.allStatuses')}</option><option value="in">{t('adminProduct.inStock')}</option><option value="out">{t('adminProduct.outOfStock')}</option><option value="low">{t('adminProduct.lowStock')}</option></select></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.minPrice')}</span><input type="number" min="0" value={filters.minPrice} onChange={(event) => changeFilter('minPrice', event.target.value)} className="w-full border rounded px-3 py-2" /></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.maxPrice')}</span><input type="number" min="0" value={filters.maxPrice} onChange={(event) => changeFilter('maxPrice', event.target.value)} className="w-full border rounded px-3 py-2" /></label>
        <label className="text-sm"><span className="block mb-1">{t('adminProduct.sort')}</span><select aria-label={t('adminProduct.sort')} value={filters.sort} onChange={(event) => changeFilter('sort', event.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="newest">{t('orders.newestFirst')}</option><option value="price-asc">{t('adminProduct.priceAsc')}</option><option value="price-desc">{t('adminProduct.priceDesc')}</option><option value="stock-asc">{t('adminProduct.stockAsc')}</option></select></label>
      </div>
      <p className="mb-3 text-sm text-gray-500">{t('adminProduct.filterHint')}</p>
      {filters.maxPrice !== '' && Number(filters.maxPrice) < Number(filters.minPrice) && <p role="alert" className="mb-3 text-sm text-red-700">{t('adminProduct.invalidPriceRange')}</p>}
      <button type='button' onClick={() => {setFilters(emptyFilters); setCurrentPage(1);}} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiRotateCcw aria-hidden='true' />{t('common.reset')}</button>
      </section>
      <div className="flex flex-wrap justify-between gap-2 mb-3 text-sm text-gray-600">{!loading && !fetchError && <p role="status">{t('adminProduct.rowCount', {count: totalItems})}</p>}</div>
      <div className="overflow-x-auto rounded-lg border border-gray-200" role="region" aria-label={t('adminProduct.title')} tabIndex={0}>
        <table className="w-full min-w-[800px] table-fixed text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr>
            <th scope="col" className="w-[10%] p-3">{t('adminProduct.productId')}</th><th scope="col" className="w-[32%] p-3">{t('adminProduct.product')}</th><th scope="col" className="w-[17%] p-3">{t('adminProduct.variantsSection')}</th><th scope="col" className="w-[14%] p-3">{t('adminProduct.price')}</th><th scope="col" className="w-[12%] p-3">{t('adminProduct.totalStock')}</th><th scope="col" className="w-[15%] p-3">{t('common.actions')}</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="p-8 text-center">{t('common.loading')}</td></tr>
            : fetchError ? <tr><td colSpan={6} className="p-8 text-center">{t('common.dataUnavailable')}</td></tr>
            : currentRows.length === 0 ? <tr><td colSpan={6} className="p-8 text-center">{t('adminProduct.noMatches')}</td></tr>
            : currentRows.map(({product, totalStock, matchingVariantCount}) => <tr key={product.id} className="border-t align-top hover:bg-gray-50">
              <td className="p-3 text-xs">#{product.id}</td>
              <td className="p-3"><div className="flex gap-3">{product.imageStaticUrl && <img src={product.imageStaticUrl} alt="" loading="lazy" className="w-14 h-14 shrink-0 object-contain rounded bg-gray-50" />}<div className="min-w-0"><button type="button" onClick={() => setSelectedProductId(product.id)} className="font-medium text-blue-700 text-left break-words line-clamp-2 hover:underline">{product.name}</button><p className="mt-1 text-xs">{categories.find((category) => category.id === product.categoryId)?.name || '-'}</p></div></div></td>
              <td className="p-3 break-words">{product.variants?.length || t('adminProduct.noVariant')}{matchingVariantCount > 0 && matchingVariantCount < product.variants.length && <p className="mt-1 text-xs text-blue-700">{t('adminProduct.matchingVariants', {count: matchingVariantCount})}</p>}</td>
              <td className="p-3 font-medium text-gray-900 break-words">{formatCurrency(product.price)}</td>
              <td className="p-3 font-medium text-gray-900">{totalStock}</td>
              <td className="p-3"><button type="button" onClick={() => setSelectedProductId(product.id)} aria-label={`${t('adminProduct.viewDetail')}: ${product.name} (#${product.id})`} title={`${t('adminProduct.viewDetail')}: ${product.name} (#${product.id})`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><FiEye size={20} aria-hidden="true" focusable="false" /></button></td>
            </tr>)}</tbody>
        </table>
      </div>
      {!fetchError && <Pagination currentPage={currentPage} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} pageSize={pageSize} pageSizeOptions={[5,10,20]} totalItems={totalItems} totalPages={totalPages} />}
      </>}

       {/* ============= PRODUCT MODAL (Create/Edit Product) ============= */}
      {isProductModalOpen && (
        <dialog ref={(node) => {if (node && !node.open) node.showModal();}} onClose={() => setIsProductModalOpen(false)} onCancel={(event) => {if (isSaving) event.preventDefault();}} aria-label={t('adminProduct.title')} className="fixed inset-0 m-0 w-screen max-w-none h-screen max-h-none bg-gray-900/50 p-2 open:flex items-center justify-center">
          <div className="relative p-6 w-full max-w-4xl max-h-full overflow-auto">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editProduct ? t('adminProduct.updateProductTitle') : t('adminProduct.addProductTitle')}
                </h3>
                <button
                  disabled={isSaving}
                  aria-label={t('common.closeModal')}
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
              
              <form className="p-6" onSubmit={handleProductSubmit}><fieldset disabled={isSaving}>
                {/* Basic Product Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="product-name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      {t('adminProduct.nameRequired')}
                    </label>
                    <input
                      type="text"
                      minLength={3} maxLength={100} id="product-name" name="name"
                      value={productFormData.name}
                      onChange={handleProductInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="product-price" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      {t('adminProduct.priceRequired')}
                    </label>
                    <input
                      type="number" min="0.1" step="0.1"
                      id="product-price" name="price"
                      value={productFormData.price}
                      onChange={handleProductInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label htmlFor="product-category" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('adminProduct.categoryRequired')}
                  </label>
                  <select
                    id="product-category" name="categoryId"
                    value={productFormData.categoryId}
                    onChange={handleProductInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('adminProduct.chooseCategory')}</option>
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
                      {t('adminProduct.staticImage')}
                    </label>
                    <input type="file" name="staticImg" accept="image/jpeg,image/png,image/gif" required={!editProduct} onChange={(event) => {if (handleProductStaticFileChange(event.target.files[0]) === false) event.target.value = '';}} className="block w-full min-w-0 text-sm" />
                    {productFormData.staticImg && (
                      <img
                        src={previewUrls.get(productFormData.staticImg)}
                        alt="preview"
                        className="w-20 h-20 mt-2 object-cover rounded"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      {t('adminProduct.dynamicImage')}
                    </label>
                    <input type="file" name="dynamicImg" accept="image/jpeg,image/png,image/gif" required={!editProduct} onChange={(event) => {if (handleProductDynamicFileChange(event.target.files[0]) === false) event.target.value = '';}} className="block w-full min-w-0 text-sm" />
                    {productFormData.dynamicImg && (
                      <img
                        src={previewUrls.get(productFormData.dynamicImg)}
                        alt="preview"
                        className="w-20 h-20 mt-2 object-cover rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Variants Section */}
                {!editProduct && (
                  <div className="variants-section mb-6 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('adminProduct.variantsSection')}</h4>
                    {productFormData.variants?.map((variant, idx) => (
                      <div key={idx} className="border border-gray-100 p-4 mb-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium">{t('adminProduct.variantNumber', {number: idx + 1})}</span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              const updated = [...productFormData.variants];
                              updated.splice(idx, 1);
                              setProductFormData({ ...productFormData, variants: updated });
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <input
                            type="text"
                            placeholder={t('adminProduct.colorPlaceholder')}
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
                            placeholder={t('adminProduct.sizePlaceholder')}
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
                            type="number" min="0" step="1"
                            placeholder={t('adminProduct.quantityPlaceholder')}
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
                          type="file" accept="image/jpeg,image/png,image/gif" required
                          onChange={(e) => {
                            const updated = [...productFormData.variants];
                            const file = e.target.files[0];
                            if (file && !validateImage(file)) {e.target.value = ''; return;}
                            updated[idx].image = file;
                            setProductFormData({ ...productFormData, variants: updated });
                          }}
                          className="mb-2"
                        />
                        {variant.image && (
                          <img
                            src={previewUrls.get(variant.image)}
                            alt="variant preview"
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        {/* Hiển thị preview tên variant */}
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <strong>{t('adminProduct.variantName')}</strong> {generateVariantName(variant.color, variant.size)}
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
                      {t('adminProduct.addVariant')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700"
                >
                  {editProduct ? t('adminProduct.updateProductTitle') : t('adminProduct.add')}
                </button>
              </fieldset></form>
            </div>
          </div>
        </dialog>
      )}

      {/* ============= VARIANT MODAL (Edit Variant Only) ============= */}
      {isVariantModalOpen && (
        <dialog ref={(node) => {if (node && !node.open) node.showModal();}} onClose={() => setIsVariantModalOpen(false)} onCancel={(event) => {if (isSaving) event.preventDefault();}} aria-label={t('adminProduct.variant')} className="fixed inset-0 m-0 w-screen max-w-none h-screen max-h-none bg-gray-900/50 p-2 open:flex items-center justify-center">
          <div className="relative p-3 sm:p-6 w-full max-w-md max-h-full overflow-y-auto">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(editVariant ? 'adminProduct.updateVariantTitle' : 'adminProduct.addVariant')}
                </h3>
                <button
                  disabled={isSaving}
                  aria-label={t('common.closeModal')}
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
              
              <form className="p-6" onSubmit={handleVariantSubmit}><fieldset disabled={isSaving}>
                <div className="mb-4">
                  <label htmlFor="variant-color" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('adminProduct.colorPlaceholder')} *
                  </label>
                  <input
                    type="text"
                    maxLength={50} id="variant-color" name="color"
                    value={variantFormData.color}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="variant-size" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('adminProduct.sizePlaceholder')} *
                  </label>
                  <input
                    type="text"
                    maxLength={100} id="variant-size" name="size"
                    value={variantFormData.size}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="variant-quantity" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('adminProduct.quantityPlaceholder')} *
                  </label>
                  <input
                    type="number" min="0" step="1"
                    id="variant-quantity" name="quantity"
                    value={variantFormData.quantity}
                    onChange={handleVariantInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('adminProduct.variantImage')}
                  </label>
                  <input type="file" name="image" accept="image/jpeg,image/png,image/gif" required={!editVariant} onChange={(event) => {if (handleVariantFileChange(event.target.files[0]) === false) event.target.value = '';}} className="block w-full min-w-0 text-sm" />
                  {variantFormData.image && (
                    <img
                      src={previewUrls.get(variantFormData.image)}
                      alt="preview"
                      className="w-20 h-20 mt-2 object-cover rounded"
                    />
                  )}
                </div>

                {/* Preview tên variant khi edit */}
                <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
                  <strong>{t('adminProduct.variantNamePreview')}</strong> {generateVariantName(variantFormData.color, variantFormData.size)}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  {t(editVariant ? 'adminProduct.updateVariant' : 'adminProduct.addVariant')}
                </button>
              </fieldset></form>
            </div>
          </div>
        </dialog>
      )}

      {/* ============= DELETE CONFIRMATION MODAL ============= */}
      {isDeleteOpen && (
        <dialog ref={(node) => {if (node && !node.open) node.showModal();}} onClose={() => setIsDeleteOpen(false)} onCancel={(event) => {if (isSaving) event.preventDefault();}} aria-label={t('adminProduct.deleteVariant')} className="fixed inset-0 m-0 w-screen max-w-none h-screen max-h-none bg-gray-900/50 p-2 open:flex items-center justify-center">
          <div className="relative p-4 w-full max-w-md max-h-full overflow-y-auto">
            <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
              <button
                disabled={isSaving}
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
                {t('adminProduct.deleteVariantConfirm')}
              </p>
              <p className="mb-4 text-sm text-gray-400 dark:text-gray-300">
                {t('adminProduct.deleteVariantWarning')}
              </p>
              <div className="flex justify-center items-center space-x-4">
                <button
                  disabled={isSaving}
                  onClick={closeDeleteModal}
                  className="py-2 px-3 text-sm font-medium text-gray-500 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  {t('common.cancel')}
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleDeleteVariant(deleteVariantId)}
                  className="py-2 px-3 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  {t('adminProduct.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
   
};

export default AdminProduct;
