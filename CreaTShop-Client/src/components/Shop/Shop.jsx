import useBackgroundRefresh from '../../hook/useBackgroundRefresh';
import SyncNotice from '../SyncNotice';
import axios from 'axios';
import {useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import Card from '../Card';
import {useLanguage} from '../../i18n/LanguageContext';
import Pagination from '../Pagination';
import {TbAdjustmentsHorizontal, TbChevronDown} from 'react-icons/tb';

const categoryOrder = ['MEN', 'WOMEN', 'BOY', 'GIRL'];

const Shop = () => {
	const [product, setProduct] = useState([]); // Danh sách sản phẩm ban đầu
	const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
	const [sortOrder, setSortOrder] = useState('');
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [categoryError, setCategoryError] = useState(false);
	const [productReload, setProductReload] = useState(0);
	const [categoryReload, setCategoryReload] = useState(0);
	const [categories, setCategories] = useState([]);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const {t} = useLanguage();
	const [searchParams, setSearchParams] = useSearchParams();
	const query = (searchParams.get('q') || '').trim();
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(12);
	const [totalItems, setTotalItems] = useState(0);
	const [searchMode, setSearchMode] = useState('catalog');
	const [fallbackReason, setFallbackReason] = useState(null);
	const [appliedFilters, setAppliedFilters] = useState({});
	const [priceFilters, setPriceFilters] = useState({minPrice: '', maxPrice: ''});
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const categoryKey = selectedCategoryIds.join(',');

	useEffect(() => {
		setCurrentPage(1);
	}, [query, setCurrentPage]);

	const getAllProduct = useCallback(async (signal, background = false) => {
		if (!background) { setLoading(true); setLoadError(false); }
		try {
			const params = new URLSearchParams({q: query, page: String(currentPage), size: String(pageSize), sort: sortOrder || 'relevance'});
			if (categoryKey) params.set('categoryIds', categoryKey);
			for (const [key, value] of Object.entries(priceFilters)) if (value !== '') params.set(key, value);
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/products/search`, {signal, params});
			if (signal?.aborted) return;
			setLoadError(false);
			setProduct(res.data.data.items);
			setTotalItems(res.data.data.totalItems);
			setSearchMode(res.data.data.mode);
			setFallbackReason(res.data.data.fallbackReason);
			setAppliedFilters(res.data.data.appliedFilters || {});
		} catch (error) {
			if (signal?.aborted) return;
			if (background) throw error;
			setLoadError(true);
		} finally {
			if (!background && !signal?.aborted) setLoading(false);
		}
	}, [query, currentPage, pageSize, sortOrder, categoryKey, priceFilters]);
	const getAllCategory = useCallback(async (signal, background = false) => {
		if (!background) setCategoryError(false);
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`, {signal});
			if (!signal?.aborted) { setCategoryError(false); setCategories(res.data.data.sort((left, right) => categoryOrder.indexOf(left.type) - categoryOrder.indexOf(right.type))); }
		} catch (error) {
			if (signal?.aborted) return;
			if (background) throw error;
			setCategoryError(true);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		const timer = setTimeout(() => getAllProduct(controller.signal), 250);
		return () => { clearTimeout(timer); controller.abort(); };
	}, [getAllProduct, productReload]);
	useEffect(() => {
		const controller = new AbortController();
		getAllCategory(controller.signal);
		return () => controller.abort();
	}, [getAllCategory, categoryReload]);

	const syncDelayed = useBackgroundRefresh(signal => Promise.all([getAllProduct(signal, true), getAllCategory(signal, true)]), !loading);

	const toggleCategory = id => {
		setSelectedCategoryIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
		setCurrentPage(1);
	};

	// Hàm sắp xếp
	const sortProducts = (order) => {
		setSortOrder(order);
		setCurrentPage(1);
	};

	return (
		<div className="flex flex-col gap-4 px-4 pb-8 lg:flex-row">
			<aside aria-label={t('shop.filters')} className="w-full shrink-0 self-start rounded-xl border border-gray-200 bg-gray-50 lg:w-56">
				<button type="button" aria-expanded={filtersOpen} aria-controls="shop-filters" onClick={() => setFiltersOpen(open => !open)} className="flex min-h-12 w-full items-center gap-2 p-4 font-semibold focus-visible:outline-red-600 lg:hidden">
					<TbAdjustmentsHorizontal aria-hidden="true" />
					{t('shop.filters')}{selectedCategoryIds.length > 0 && ` (${selectedCategoryIds.length})`}
					<TbChevronDown aria-hidden="true" className={`ml-auto transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
				</button>
				<div id="shop-filters" className={`${filtersOpen ? 'block' : 'hidden'} p-4 lg:block`}>
					<div className="mb-4 flex items-center justify-between gap-2">
						<h2 className="font-semibold">{t('shop.categories')}</h2>
						<button type="button" onClick={() => { setSelectedCategoryIds([]); setSortOrder(''); setCurrentPage(1); }} className="min-h-11 text-sm underline underline-offset-4 focus-visible:outline-red-600">{t('common.reset')}</button>
					</div>
					{categoryError && <div role="alert"><p>{t('shop.fetchCategoriesError')}</p><button onClick={() => setCategoryReload(value => value + 1)} className="min-h-11 underline">{t('common.retry')}</button></div>}
					{categories.filter(group => group.categories.length > 0).map(group => (
						<fieldset key={group.type} className="mb-4 min-w-0 border-t border-gray-200 pt-2 last:mb-0">
							<legend className="pr-2 text-xs font-bold tracking-wide text-gray-600">{t(`category.${group.type.toLowerCase()}`)}</legend>
							{group.categories.map(item => (
								<label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm text-gray-700">
									<input type="checkbox" checked={selectedCategoryIds.includes(item.id)} onChange={() => toggleCategory(item.id)} className="h-5 w-5 shrink-0 rounded border-gray-400 text-gray-900 accent-gray-900 focus:ring-gray-900" />
									<span className={`min-w-0 break-words ${selectedCategoryIds.includes(item.id) ? 'font-semibold text-gray-950' : ''}`}>{item.name}</span>
								</label>
							))}
						</fieldset>
					))}
				</div>
			</aside>
	
			{/* Danh sách sản phẩm */}
			<div className="min-w-0 flex-1">
				<SyncNotice stale={syncDelayed} />
				<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<h1 className="break-words text-2xl font-bold">{query ? t('search.results', {query}) : t('nav.shop')}</h1>
						<p role="status" className="mt-1 min-h-5 text-sm text-gray-500">{!loading && !loadError ? t('search.count', {count: totalItems}) : null}</p>
						{query && !loading && !loadError && <p className="mt-1 text-sm text-gray-500">{t(searchMode === 'hybrid' ? 'discovery.semantic' : 'discovery.keyword')}{fallbackReason && ` - ${t('discovery.fallback')}`}</p>}
					</div>
					{query && <button type="button" onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.delete('q'); return next; })} className="text-sm underline underline-offset-4">{t('search.clear')}</button>}
					<label className="flex w-full items-center gap-2 text-sm sm:ml-auto sm:w-auto">
						<span className="shrink-0">{t('shop.sort')}</span>
						<select value={sortOrder} onChange={event => sortProducts(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 focus:border-red-600 focus:outline-red-600 sm:flex-none">
							<option value="">{t('shop.defaultOrder')}</option>
							<option value="asc">{t('shop.priceLowHigh')}</option>
							<option value="desc">{t('shop.priceHighLow')}</option>
						</select>
					</label>
				</div>
				<div className="mb-5 flex flex-wrap gap-3">{['minPrice', 'maxPrice'].map(field => <label key={field} className="text-sm">
					<span className="mb-1 block">{t(`discovery.${field}`)}</span>
					<input type="number" min="0" max="999999999999999" step="1" value={priceFilters[field]} onChange={event => {
						setPriceFilters(previous => ({...previous, [field]: event.target.value})); setCurrentPage(1);
					}} className="min-h-11 w-40 rounded-lg border p-2" />
				</label>)}</div>
				{!loading && !loadError && (appliedFilters.minPrice != null || appliedFilters.maxPrice != null) && <p role="status" className="mb-3 text-sm text-gray-600">{['minPrice', 'maxPrice'].filter(field => appliedFilters[field] != null).map(field => `${t(`discovery.${field}`)}: ${Number(appliedFilters[field]).toLocaleString()}`).join(' | ')}</p>}
				<div aria-busy={loading} className="grid grid-cols-2 content-start gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
					{/* Hiển thị danh sách sản phẩm */}
					{loading ? <>
						<span role="status" className="sr-only">{t('common.loading')}</span>
						{Array.from({length: pageSize}, (_, index) => <div key={index} aria-hidden="true" className="overflow-hidden rounded-xl border border-gray-200 bg-white motion-safe:animate-pulse">
							<div className="aspect-square bg-gray-100" />
							<div className="p-3 sm:p-4"><div className="mb-2 h-12 rounded bg-gray-100" /><div className="h-6 w-20 rounded bg-gray-100" /></div>
						</div>)}
					</> : loadError ? (
						<div role="alert"><p>{t('common.dataUnavailable')}</p><button onClick={() => setProductReload(value => value + 1)} className="underline">{t('common.retry')}</button></div>
					) : product.length > 0 ? (
						product.map((item) => (
							<Card key={item.id} product={item} />
						))
					) : (
						<p className="col-span-full rounded-lg bg-gray-50 p-5">{t(query ? 'search.noResults' : 'shop.noProducts')}</p>
					)}
				</div>
				{!loading && !loadError && <Pagination
					currentPage={currentPage}
					onPageChange={setCurrentPage}
					onPageSizeChange={value => { setPageSize(value); setCurrentPage(1); }}
					pageSize={pageSize}
					pageSizeOptions={[8, 12, 24, 40]}
					totalItems={totalItems}
					totalPages={totalPages}
				/>}
			</div>
		</div>
	);
	
};

export default Shop;
