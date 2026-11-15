import useBackgroundRefresh from '../../hook/useBackgroundRefresh';
import SyncNotice from '../SyncNotice';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {FiFilter, FiRotateCcw, FiEye, FiLock, FiUnlock} from 'react-icons/fi';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';
import useClientPagination from '../../hook/useClientPagination';
import Pagination from '../Pagination';
import {countActiveFilters} from '../../utils/adminFilters';
import {selectUsers} from '../../utils/adminDirectory';

const AdminUser = () => {
	const {user: actor} = useAuth();
	const {t, formatDate} = useLanguage();
	const [users, setUsers] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState({query: '', status: '', role: ''});
	const filterCount = countActiveFilters(filters);
	const [loading, setLoading] = useState(false);
	const [fetchError, setFetchError] = useState(false);
	const [busy, setBusy] = useState(false);
	const submitting = useRef(false);
	const [selectedId, setSelectedId] = useState(null);
	const [pending, setPending] = useState(null);
	const selected = users.find(user => user.id === selectedId);
	const filtered = useMemo(() => selectUsers(users, filters), [users, filters]);
	const pager = useClientPagination(filtered, 5);
	const fetchUsers = useCallback(async (signal, background = false) => {
		if (!background) setLoading(true);
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {headers: {Authorization: `Bearer ${actor?.token}`}, signal});
			if (signal?.aborted) return;
			setUsers(response.data.data || []);
			setFetchError(false);
		} catch (error) {
			if (signal?.aborted) return;
			if (background) throw error;
			setFetchError(true);
			toast.error(t('adminUser.fetchError'));
		} finally {if (!background && !signal?.aborted) setLoading(false);}
	}, [actor?.token, t]);
	useEffect(() => {
		const controller = new AbortController();
		if (actor?.token) fetchUsers(controller.signal);
		return () => controller.abort();
	}, [actor?.token, fetchUsers]);
	const updateStatus = async () => {
		if (submitting.current || !pending) return;
		submitting.current = true;
		setBusy(true);
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}/users/${pending.id}?isLocked=${pending.status === 'ACTIVE'}`, {}, {headers: {Authorization: `Bearer ${actor?.token}`}});
			toast.success(t('adminUser.updateSuccess'));
		} catch (error) {toast.error(error.response?.data?.meta?.message || t('adminUser.updateError'));}
		finally {await fetchUsers(); setPending(null); submitting.current = false; setBusy(false);}
	};
	const syncDelayed = useBackgroundRefresh(signal => fetchUsers(signal, true), Boolean(actor?.token) && !loading && !busy && !pending);
	const changeFilter = (name, value) => {setFilters(previous => ({...previous, [name]: value})); pager.setCurrentPage(1);};
	const roleLabel = role => role === 'ROLE_ADMIN' ? t('directory.admin') : role === 'ROLE_USER' ? t('directory.customer') : '-';
	const statusLabel = status => status === 'ACTIVE' ? t('common.active') : status === 'BANNED' ? t('common.banned') : '-';
	return <div className='w-full min-w-0 p-2 sm:p-4'>
		<div className='flex flex-wrap items-center justify-between gap-3 mb-4'><h1 className='text-2xl font-bold'>{t('adminUser.title')}</h1><button type='button' aria-label={t('common.filters')} aria-expanded={showFilters} aria-controls='admin-users-filters' onClick={() => setShowFilters(value => !value)} className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiFilter aria-hidden='true' />{t('common.filters')}{filterCount > 0 && <span aria-hidden='true' className='rounded-full bg-blue-100 px-2 text-xs text-blue-800'>{filterCount}</span>}</button></div>
		<SyncNotice stale={syncDelayed} />
		{filterCount > 0 && <p role='status' className='mb-3 text-sm text-blue-800'>{t('common.activeFilters', {count: filterCount})}</p>}
		<section id='admin-users-filters' hidden={!showFilters} aria-label={t('common.filters')} className='mb-4 rounded-xl border border-slate-200 bg-white p-4'>
		<div className='grid sm:grid-cols-3 gap-3 mb-4'>
			<label>{t('directory.searchUser')}<input type='search' value={filters.query} onChange={event => changeFilter('query', event.target.value)} className='block w-full border rounded px-3 py-2' /></label>
			<label>{t('common.status')}<select aria-label={t('common.status')} value={filters.status} onChange={event => changeFilter('status', event.target.value)} className='block w-full border rounded px-3 py-2 bg-white'><option value=''>{t('directory.all')}</option><option value='ACTIVE'>{t('common.active')}</option><option value='BANNED'>{t('common.banned')}</option></select></label>
			<label>{t('directory.role')}<select aria-label={t('directory.role')} value={filters.role} onChange={event => changeFilter('role', event.target.value)} className='block w-full border rounded px-3 py-2 bg-white'><option value=''>{t('directory.all')}</option><option value='ROLE_ADMIN'>{t('directory.admin')}</option><option value='ROLE_USER'>{t('directory.customer')}</option></select></label>
		</div>
		<button type='button' onClick={() => {setFilters({query: '', role: '', status: ''}); pager.setCurrentPage(1);}} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiRotateCcw aria-hidden='true' />{t('common.reset')}</button>
		</section>
		<div className='flex justify-between gap-3 mb-3 text-sm'><p role='status'>{t('directory.results', {count: filtered.length, total: users.length})}</p></div>
		{fetchError && <p role='alert' className='text-red-700 mb-3'>{t('adminUser.fetchError')}</p>}
		<div role='region' aria-label={t('adminUser.title')} tabIndex={0} className='overflow-x-auto border rounded-lg'>
			<table className='w-full min-w-[800px] text-sm text-left'>
				<thead className='bg-gray-50 text-gray-700'><tr>{['directory.index', 'common.username', 'common.email', 'directory.phone', 'directory.role', 'common.status', 'common.actions'].map(key => <th key={key} scope='col' className='px-4 py-3'>{t(key)}</th>)}</tr></thead>
				<tbody>{loading ? <tr><td colSpan={7} className='p-6 text-center'>{t('common.loading')}</td></tr> : !filtered.length ? <tr><td colSpan={7} className='p-6 text-center'>{t('directory.empty')}</td></tr> : pager.paginatedItems.map((user, index) => <tr key={user.id} className='border-t'>
					<td className='px-4 py-3'>{pager.startIndex + index + 1}</td><td className='px-4 py-3 font-medium'>{user.username}</td><td className='px-4 py-3 break-all'>{user.email}</td><td className='px-4 py-3'>{user.phoneNumber || '-'}</td><td className='px-4 py-3'>{roleLabel(user.role)}</td><td className='px-4 py-3'><span className={`inline-block rounded px-2 py-1 ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>{statusLabel(user.status)}</span></td>
					<td className='px-4 py-3'><div className='flex gap-1'>
						<button type='button' aria-label={`${t('directory.details')}: ${user.username}`} title={t('directory.details')} onClick={() => setSelectedId(user.id)} className='inline-flex min-h-11 min-w-11 items-center justify-center rounded text-blue-700 hover:bg-blue-50'><FiEye size={20} aria-hidden='true' /></button>
						<button type='button' disabled={busy || loading || user.username === actor?.username || user.id === actor?.id || user.id === actor?.idUser || !['ACTIVE', 'BANNED'].includes(user.status)} aria-label={`${t(user.status === 'ACTIVE' ? 'directory.lock' : 'directory.unlock')}: ${user.username}`} title={t(user.status === 'ACTIVE' ? 'directory.lock' : 'directory.unlock')} onClick={() => setPending(user)} className='inline-flex min-h-11 min-w-11 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40'>{user.status === 'ACTIVE' ? <FiLock size={20} aria-hidden='true' /> : <FiUnlock size={20} aria-hidden='true' />}</button>
					</div></td>
				</tr>)}</tbody>
			</table>
		</div>
		<Pagination currentPage={pager.currentPage} onPageChange={pager.setCurrentPage} onPageSizeChange={pager.setPageSize} pageSize={pager.pageSize} totalItems={pager.totalItems} totalPages={pager.totalPages} />
		{selected && <dialog ref={node => {if (node && !node.open) node.showModal();}} onClose={() => setSelectedId(null)} aria-labelledby='user-detail-title' className='m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 backdrop:bg-black/50'>
			<h2 id='user-detail-title' className='text-xl font-bold mb-4'>{t('directory.details')}: {selected.username}</h2>
			<dl className='grid grid-cols-[auto_1fr] gap-3 break-words'>
				<dt>{t('common.id')}</dt><dd className='break-all'>{selected.id}</dd><dt>{t('directory.fullName')}</dt><dd>{[selected.firstName, selected.lastName].filter(Boolean).join(' ') || '-'}</dd>
				<dt>{t('common.email')}</dt><dd className='break-all'>{selected.email}</dd><dt>{t('directory.phone')}</dt><dd>{selected.phoneNumber || '-'}</dd>
				<dt>{t('directory.role')}</dt><dd>{roleLabel(selected.role)}</dd><dt>{t('common.status')}</dt><dd>{statusLabel(selected.status)}</dd><dt>{t('directory.createdAt')}</dt><dd>{selected.createdAt ? formatDate(selected.createdAt) : '-'}</dd>
			</dl>
			<button autoFocus type='button' onClick={() => setSelectedId(null)} className='mt-5 border rounded px-4 py-2'>{t('orders.closeDetail')}</button>
		</dialog>}
		{pending && <dialog ref={node => {if (node && !node.open) node.showModal();}} onClose={() => setPending(null)} onCancel={event => {if (busy) event.preventDefault();}} aria-labelledby='user-status-title' className='m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-6 backdrop:bg-black/50'>
			<h2 id='user-status-title' className='text-xl font-bold'>{t(pending.status === 'ACTIVE' ? 'directory.lock' : 'directory.unlock')}: {pending.username}</h2><p className='my-4'>{t(pending.status === 'ACTIVE' ? 'directory.lockConfirm' : 'directory.unlockConfirm')}</p>
			<div className='flex justify-end gap-3'><button autoFocus type='button' disabled={busy} onClick={() => setPending(null)} className='border rounded px-4 py-2'>{t('common.cancel')}</button><button type='button' disabled={busy} onClick={updateStatus} className='bg-red-700 text-white rounded px-4 py-2'>{t(busy ? 'common.loading' : 'directory.confirm')}</button></div>
		</dialog>}
	</div>;
};
export default AdminUser;
