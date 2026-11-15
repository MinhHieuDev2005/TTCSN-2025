import useBackgroundRefresh from '../../hook/useBackgroundRefresh';
import SyncNotice from '../SyncNotice';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {FiFilter, FiRotateCcw, FiEdit2, FiTrash2} from 'react-icons/fi';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';
import useClientPagination from '../../hook/useClientPagination';
import Pagination from '../Pagination';
import {countActiveFilters} from '../../utils/adminFilters';
import {selectCategories} from '../../utils/adminDirectory';

const types = ['MEN', 'WOMEN', 'BOY', 'GIRL'];
const emptyForm = {name: '', description: '', type: ''};

const AdminCategory = () => {
	const {user} = useAuth();
	const {t} = useLanguage();
	const [categories, setCategories] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState({query: '', type: ''});
	const filterCount = countActiveFilters(filters);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const submitting = useRef(false);
	const [editor, setEditor] = useState(null);
	const [form, setForm] = useState(emptyForm);
	const [deleting, setDeleting] = useState(null);
	const [fetchError, setFetchError] = useState(false);
	const filtered = useMemo(() => selectCategories(categories, filters), [categories, filters]);
	const pager = useClientPagination(filtered, 5);
	const fetchCategories = useCallback(async (signal, background = false) => {
		if (!background) setLoading(true);
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/categories`, {signal});
			if (signal?.aborted) return;
			setCategories((response.data.data || []).flatMap(group => group.categories || []));
			setFetchError(false);
		} catch (error) {
			if (signal?.aborted) return;
			if (background) throw error;
			setFetchError(true);
			toast.error(t('shop.fetchCategoriesError'));
		} finally { if (!background && !signal?.aborted) setLoading(false); }
	}, [t]);
	useEffect(() => {
		const controller = new AbortController();
		fetchCategories(controller.signal);
		return () => controller.abort();
	}, [fetchCategories]);
	const openEditor = category => {
		setEditor(category || {});
		setForm(category ? {name: category.name, description: category.description || '', type: category.type} : {...emptyForm});
	};
	const save = async event => {
		event.preventDefault();
		if (submitting.current) return;
		submitting.current = true;
		setBusy(true);
		try {
			const url = `${import.meta.env.VITE_API_URL}/categories${editor.id ? `/${editor.id}` : ''}`;
			await axios[editor.id ? 'put' : 'post'](url, {...form, name: form.name.trim()}, {headers: {Authorization: `Bearer ${user?.token}`}});
			toast.success(t(editor.id ? 'adminCategory.saveUpdateSuccess' : 'adminCategory.saveCreateSuccess'));
			setEditor(null);
			await fetchCategories();
		} catch (error) {
			toast.error(error.response?.data?.meta?.message || t(editor.id ? 'adminCategory.saveUpdateError' : 'adminCategory.saveCreateError'));
		} finally { submitting.current = false; setBusy(false); }
	};
	const remove = async () => {
		if (submitting.current || !deleting) return;
		submitting.current = true;
		setBusy(true);
		try {
			await axios.delete(`${import.meta.env.VITE_API_URL}/categories/${deleting.id}`, {headers: {Authorization: `Bearer ${user?.token}`}});
			toast.success(t('adminCategory.deleteSuccess'));
			setDeleting(null);
			await fetchCategories();
		} catch (error) {
			toast.error(error.response?.data?.meta?.message || t('adminCategory.deleteError'));
			setDeleting(null);
			await fetchCategories();
		} finally { submitting.current = false; setBusy(false); }
	};
	const syncDelayed = useBackgroundRefresh(signal => fetchCategories(signal, true), !loading && !busy && !editor && !deleting);
	const changeFilter = (name, value) => { setFilters(previous => ({...previous, [name]: value})); pager.setCurrentPage(1); };
	return <div className='w-full min-w-0 p-2 sm:p-4'>
		<div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
			<h1 className='text-2xl font-bold'>{t('adminCategory.title')}</h1>
			<div className='flex gap-2'>
				<button type='button' aria-label={t('common.filters')} aria-expanded={showFilters} aria-controls='admin-categories-filters' onClick={() => setShowFilters(value => !value)} className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiFilter aria-hidden='true' />{t('common.filters')}{filterCount > 0 && <span aria-hidden='true' className='rounded-full bg-blue-100 px-2 text-xs text-blue-800'>{filterCount}</span>}</button>
				<button type='button' onClick={() => openEditor(null)} className='bg-red-700 text-white rounded px-4 py-2'>{t('adminCategory.add')}</button>
			</div>
		</div>
		<SyncNotice stale={syncDelayed} />
		{filterCount > 0 && <p role='status' className='mb-3 text-sm text-blue-800'>{t('common.activeFilters', {count: filterCount})}</p>}
		<section id='admin-categories-filters' hidden={!showFilters} aria-label={t('common.filters')} className='mb-4 rounded-xl border border-slate-200 bg-white p-4'>
		<div className='grid sm:grid-cols-2 gap-3 mb-4'>
			<label>{t('directory.search')}<input type='search' value={filters.query} onChange={event => changeFilter('query', event.target.value)} className='block w-full border rounded px-3 py-2' /></label>
			<label>{t('adminCategory.type')}<select aria-label={t('adminCategory.type')} value={filters.type} onChange={event => changeFilter('type', event.target.value)} className='block w-full border rounded px-3 py-2 bg-white'>
				<option value=''>{t('directory.all')}</option>{types.map(type => <option key={type} value={type}>{t(`category.${type.toLowerCase()}`)}</option>)}
			</select></label>
		</div>
		<button type='button' onClick={() => {setFilters({query: '', type: ''}); pager.setCurrentPage(1);}} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiRotateCcw aria-hidden='true' />{t('common.reset')}</button>
		</section>
		<div className='flex justify-between gap-3 mb-3 text-sm'><p role='status'>{t('directory.results', {count: filtered.length, total: categories.length})}</p></div>
		{fetchError && <p role='alert' className='text-red-700 mb-3'>{t('shop.fetchCategoriesError')}</p>}
		<div role='region' aria-label={t('adminCategory.title')} tabIndex={0} className='overflow-x-auto border rounded-lg'>
			<table className='w-full min-w-[700px] text-sm text-left'>
				<thead className='bg-gray-50 text-gray-700'><tr>{['common.id', 'adminCategory.name', 'adminCategory.type', 'directory.productCount', 'adminCategory.description', 'common.actions'].map(key => <th key={key} scope='col' className='px-4 py-3'>{t(key)}</th>)}</tr></thead>
				<tbody>{loading ? <tr><td colSpan={6} className='p-6 text-center'>{t('common.loading')}</td></tr> : !filtered.length ? <tr><td colSpan={6} className='p-6 text-center'>{t('directory.empty')}</td></tr> : pager.paginatedItems.map(category => <tr key={category.id} className='border-t'>
					<td className='px-4 py-3'>#{category.id}</td><td className='px-4 py-3 font-medium'>{category.name}</td><td className='px-4 py-3'>{t(`category.${category.type.toLowerCase()}`)}</td>
					<td className='px-4 py-3'>{category.productCount ?? '-'}</td><td className='px-4 py-3 max-w-xs break-words'>{category.description || '-'}</td>
					<td className='px-4 py-3'><div className='flex gap-1'>
						<button type='button' aria-label={`${t('adminCategory.editTitle')}: ${category.name}`} title={t('adminCategory.editTitle')} onClick={() => openEditor(category)} className='inline-flex min-h-11 min-w-11 items-center justify-center rounded text-blue-700 hover:bg-blue-50'><FiEdit2 aria-hidden='true' size={20} /></button>
						<button type='button' aria-label={`${t('directory.delete')}: ${category.name}`} title={category.productCount > 0 ? t('directory.categoryInUse') : t('directory.delete')} disabled={category.productCount > 0} onClick={() => setDeleting(category)} className='inline-flex min-h-11 min-w-11 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40'><FiTrash2 aria-hidden='true' size={20} /></button>
					</div></td>
				</tr>)}</tbody>
			</table>
		</div>
		<p className='mt-3 text-sm text-gray-500'>{t('directory.categoryInUse')}</p>
		<Pagination currentPage={pager.currentPage} onPageChange={pager.setCurrentPage} onPageSizeChange={pager.setPageSize} pageSize={pager.pageSize} totalItems={pager.totalItems} totalPages={pager.totalPages} />
		{editor && <dialog ref={node => {if (node && !node.open) node.showModal();}} onClose={() => setEditor(null)} onCancel={event => {if (busy) event.preventDefault();}} aria-labelledby='category-editor-title' className='m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 backdrop:bg-black/50'>
			<h2 id='category-editor-title' className='text-xl font-bold mb-4'>{t(editor.id ? 'adminCategory.editTitle' : 'adminCategory.addTitle')}</h2>
			<form onSubmit={save} className='space-y-4'>
				<label className='block'>{t('adminCategory.name')}<input autoFocus required maxLength={255} value={form.name} onChange={event => setForm({...form, name: event.target.value})} className='block w-full border rounded px-3 py-2' /></label>
				<label className='block'>{t('adminCategory.type')}<select aria-label={t('adminCategory.type')} required value={form.type} onChange={event => setForm({...form, type: event.target.value})} className='block w-full border rounded px-3 py-2 bg-white'><option value=''>{t('adminCategory.selectCategory')}</option>{types.map(type => <option key={type} value={type}>{t(`category.${type.toLowerCase()}`)}</option>)}</select></label>
				<label className='block'>{t('adminCategory.description')}<textarea aria-label={t('adminCategory.description')} maxLength={255} rows={3} value={form.description} onChange={event => setForm({...form, description: event.target.value})} className='block w-full border rounded px-3 py-2' /></label>
				<div className='flex justify-end gap-3'><button type='button' disabled={busy} onClick={() => setEditor(null)} className='border rounded px-4 py-2'>{t('common.cancel')}</button><button type='submit' disabled={busy || !form.name.trim()} className='bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50'>{t(busy ? 'common.loading' : 'common.save')}</button></div>
			</form>
		</dialog>}
		{deleting && <dialog ref={node => {if (node && !node.open) node.showModal();}} onClose={() => setDeleting(null)} onCancel={event => {if (busy) event.preventDefault();}} aria-labelledby='category-delete-title' className='m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-6 backdrop:bg-black/50'>
			<h2 id='category-delete-title' className='text-xl font-bold'>{t('directory.delete')}: {deleting.name} (#{deleting.id})</h2><p className='my-4'>{t('adminCategory.deleteConfirm')}</p>
			<div className='flex justify-end gap-3'><button type='button' autoFocus disabled={busy} onClick={() => setDeleting(null)} className='border rounded px-4 py-2'>{t('common.cancel')}</button><button type='button' disabled={busy} onClick={remove} className='bg-red-700 text-white rounded px-4 py-2'>{t(busy ? 'common.loading' : 'directory.delete')}</button></div>
		</dialog>}
	</div>;
};
export default AdminCategory;
