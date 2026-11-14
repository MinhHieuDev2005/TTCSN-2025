import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Bar} from 'react-chartjs-2';
import {Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend} from 'chart.js';
import {FiUsers, FiUserCheck, FiLayers, FiHelpCircle, FiFilter, FiRotateCcw, FiArrowRight, FiPackage, FiShoppingBag, FiCreditCard, FiTrendingUp, FiTruck, FiClock, FiAlertCircle} from 'react-icons/fi';
import axios from 'axios';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {dashboardRange, validDashboardRange} from '../utils/dashboard';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
	const {user} = useAuth();
	const {t, formatCurrency, language} = useLanguage();
	const [range, setRange] = useState(() => dashboardRange(30));
	const [draft, setDraft] = useState(range);
	const [preset, setPreset] = useState('30');
	const [showFilters, setShowFilters] = useState(false);
	const [helpDismissed, setHelpDismissed] = useState(false);
	const [metric, setMetric] = useState('paidOrderValue');
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [refresh, setRefresh] = useState(0);
	const valid = validDashboardRange(draft);
	const pendingRange = draft.fromDate !== range.fromDate || draft.toDate !== range.toDate;

	useEffect(() => {
		const dismissHelp = event => {if (event.key === 'Escape') setHelpDismissed(true);};
		document.addEventListener('keydown', dismissHelp);
		return () => document.removeEventListener('keydown', dismissHelp);
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(false);
		setData(null);
		axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
			params: range, headers: {Authorization: `Bearer ${user?.token}`}, signal: controller.signal,
		}).then(response => {
			if (!controller.signal.aborted) setData(response.data.data);
		}).catch(() => {
			if (!controller.signal.aborted) setError(true);
		}).finally(() => {
			if (!controller.signal.aborted) setLoading(false);
		});
		return () => controller.abort();
	}, [range, refresh, user?.token]);
	const selectPreset = value => {
		setPreset(value);
		if (value !== 'custom') {
			const dates = dashboardRange(Number(value));
			setDraft(dates);
			setRange(dates);
		}
	};
	const kpis = data ? [
		{label: t('dash.paidValue'), value: formatCurrency(data.paidOrderValue), icon: FiCreditCard, hint: t('dash.paidHint'), tone: 'border-t-emerald-700 from-emerald-50 to-white', iconTone: 'bg-emerald-700 text-white', swatch: 'bg-emerald-700'},
		{label: t('dash.createdOrders'), value: data.ordersCreated, icon: FiShoppingBag, hint: t('dash.createdHint'), tone: 'border-t-blue-700 from-blue-50 to-white', iconTone: 'bg-blue-700 text-white', swatch: 'bg-blue-700'},
		{label: t('dash.paidOrders'), value: data.paidOrders, icon: FiPackage, hint: t('dash.paidCountHint'), tone: 'border-t-orange-700 from-orange-50 to-white', iconTone: 'bg-orange-700 text-white', swatch: 'bg-orange-700'},
		{label: t('dash.average'), value: formatCurrency(data.averagePaidOrderValue), icon: FiTrendingUp, hint: t('dash.averageHint'), tone: 'border-t-pink-700 from-pink-50 to-white', iconTone: 'bg-pink-700 text-white', swatch: 'bg-pink-700'},
	] : [];
	const queues = data ? [
		['dash.ready', data.backlog.readyToShip, FiClock, 'bg-stone-600 text-white'],
		['dash.shipped', data.backlog.shipped, FiTruck, 'bg-blue-700 text-white'],
		['dash.cod', data.backlog.codUncollected, FiCreditCard, 'bg-amber-700 text-white'],
		['dash.refund', data.backlog.refundRequired, FiAlertCircle, 'bg-red-700 text-white'],
	] : [];
	return <div className='w-full min-w-0 space-y-5 rounded-2xl bg-slate-50/70 p-2 sm:p-4'>
		<header className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 sm:p-6'>
			<div className='flex min-w-0 items-center gap-3'><span className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-md'><FiTrendingUp aria-hidden='true' size={24} /></span><h1 className='text-2xl font-bold text-gray-900'>{t('dash.title')}</h1></div>
			<button type='button' aria-expanded={showFilters} aria-controls='admin-dashboard-filters' onClick={() => setShowFilters(value => !value)} className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiFilter aria-hidden='true' />{t('common.filters')}</button>
		</header>
		<section id='admin-dashboard-filters' hidden={!showFilters} aria-label={t('common.filters')}>
		<form onSubmit={event => {event.preventDefault(); if (valid) setRange({...draft});}} className='flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
			<label className='flex w-full flex-col gap-1 text-sm sm:w-44'>{t('dash.period')}<select aria-label={t('dash.period')} value={preset} onChange={event => selectPreset(event.target.value)} className='h-11 w-full min-w-0 rounded border bg-white px-3 py-2'><option value='1'>{t('dash.today')}</option><option value='7'>{t('dash.seven')}</option><option value='30'>{t('dash.thirty')}</option><option value='custom'>{t('dash.custom')}</option></select></label>
			{['fromDate', 'toDate'].map(field => <label key={field} className='flex w-full flex-col gap-1 text-sm sm:w-44'>{t(`orders.${field}`)}<input type='date' required min='1970-01-01' max='9999-12-31' value={draft[field]} onChange={event => {setPreset('custom'); setDraft(previous => ({...previous, [field]: event.target.value}));}} className='h-11 w-full min-w-0 rounded border bg-white px-3 py-2' /></label>)}
			<button type='submit' disabled={!valid || loading} className='h-11 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50'>{t('dash.apply')}</button>
			<button type='button' onClick={() => {const dates = dashboardRange(30); setPreset('30'); setDraft(dates); setRange(dates);}} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiRotateCcw aria-hidden='true' />{t('common.reset')}</button>
			{valid && pendingRange && <p role='status' className='w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'>{t('dash.pendingRange')}</p>}
			{!valid && <p role='alert' className='w-full text-sm text-red-700'>{t('dash.invalidRange')}</p>}
		</form>
		</section>
		{loading && <p role='status' className='rounded-lg border p-8 text-center text-gray-600'>{t('common.loading')}</p>}
		{error && <div role='alert' className='border border-red-200 bg-red-50 text-red-800 rounded-lg p-4'><p>{t('dash.error')}</p><button type='button' onClick={() => setRefresh(value => value + 1)} className='mt-2 underline'>{t('dash.retry')}</button></div>}
		{data && !loading && !error && <>
			<section aria-label={t('dash.summary')}>
				<div className='mb-3 flex items-center justify-between gap-3 text-xs text-slate-600'>
					<ul aria-label={t('dash.colorLegend')} className='flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-2'>
						{kpis.map(({label, swatch}) => <li key={label} className='inline-flex items-center gap-2'><span aria-hidden='true' className={`h-2.5 w-2.5 shrink-0 rounded-full ${swatch}`} />{label}</li>)}
					</ul>
					<div className='group relative shrink-0' onMouseEnter={() => setHelpDismissed(false)} onFocus={() => setHelpDismissed(false)}>
						<button type='button' aria-label={t('dash.calculation')} aria-describedby='dashboard-metric-help' onClick={() => setHelpDismissed(false)} className='inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiHelpCircle aria-hidden='true' size={20} /></button>
						<div id='dashboard-metric-help' role='tooltip' className={`absolute right-0 top-full z-20 w-[min(24rem,calc(100vw-3rem))] pt-2 ${helpDismissed ? 'hidden' : 'hidden group-hover:block group-focus-within:block'}`}>
							<div className='max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-lg'>
								<dl className='space-y-3'>{kpis.map(({label, hint}) => <div key={label}><dt className='font-semibold text-slate-900'>{label}</dt><dd className='mt-1'>{hint}</dd></div>)}</dl>
								<p className='mt-3 border-t border-slate-200 pt-3'>{t('dash.moneyHint')}</p>
							</div>
						</div>
					</div>
				</div>
				<div className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4'>{kpis.map(({label, value, icon: Icon, tone, iconTone}) => <article key={label} className={`dashboard-stat relative isolate overflow-hidden rounded-2xl border border-t-4 border-slate-200 bg-white bg-gradient-to-br p-5 text-slate-900 shadow-sm ${tone}`}>
					<Icon aria-hidden='true' className='pointer-events-none absolute -bottom-4 -right-4 -z-10 text-slate-900/[0.04]' size={112} />
					<div className='flex items-start justify-between gap-3'><h3 className='text-sm font-semibold pt-2'>{label}</h3><span className={`inline-flex shrink-0 items-center justify-center rounded-2xl p-3 shadow-md ${iconTone}`}><Icon aria-hidden='true' size={24} /></span></div>
					<p className='mt-3 text-2xl font-bold tracking-tight break-words tabular-nums'>{value}</p>
				</article>)}</div>
			</section>
			<section aria-labelledby='dashboard-work-title'>
				<div className='flex flex-wrap justify-between items-center gap-2 mb-3'><div className='flex flex-wrap items-center gap-2'><h2 id='dashboard-work-title' className='text-lg font-semibold'>{t('dash.work')}</h2></div><Link to='/admin/orders' className='inline-flex items-center gap-2 text-sm text-blue-700'>{t('dash.manageOrders')}<FiArrowRight aria-hidden='true' /></Link></div>
				<div className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4'>{queues.map(([key, count, Icon, tone]) => <article key={key} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
					<div className='flex items-center justify-between gap-3'><h3 className='text-sm font-medium text-slate-600'>{t(key)}</h3><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${count > 0 ? tone : 'bg-slate-100 text-slate-500'}`}><Icon aria-hidden='true' size={18} /></span></div><p className={`mt-3 text-2xl font-bold tabular-nums ${count > 0 ? 'text-slate-900' : 'text-slate-500'}`}>{count}</p>
				</article>)}</div>
			</section>
			<div className='grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(20rem,1fr)]'>
				<section aria-labelledby='dashboard-trend-title' className='flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'>
					<div className='flex flex-wrap justify-between items-center gap-3 mb-4'><h2 id='dashboard-trend-title' className='flex items-center gap-2 text-lg font-semibold'><FiTrendingUp aria-hidden='true' className='shrink-0 text-emerald-700' size={22} />{t('dash.trend')}</h2><label className='flex max-w-full items-center gap-2 text-sm'>{t('dash.metric')}<select aria-label={t('dash.metric')} value={metric} onChange={event => setMetric(event.target.value)} className='min-w-0 border rounded px-3 py-2 bg-white'><option value='paidOrderValue'>{t('dash.paidValue')}</option><option value='ordersCreated'>{t('dash.createdOrders')}</option></select></label></div>
					{data.ordersCreated === 0 && <p role='status' className='text-sm text-gray-500 mb-3'>{t('dash.noOrders')}</p>}
					<div className='relative h-72 w-full min-w-0 xl:h-auto xl:min-h-80 xl:flex-1'><Bar className='absolute inset-0 max-w-full' aria-label={t('dash.trend')} role='img' data={{labels: data.days.map(day => day.date), datasets: [{label: t(metric === 'paidOrderValue' ? 'dash.paidValue' : 'dash.createdOrders'), data: data.days.map(day => day[metric]), backgroundColor: metric === 'paidOrderValue' ? '#047857' : '#1d4ed8', borderRadius: 4, maxBarThickness: 36}]}} options={{responsive: true, maintainAspectRatio: false, plugins: {legend: {display: false}, tooltip: {callbacks: {label: context => metric === 'paidOrderValue' ? formatCurrency(context.parsed.y) : String(context.parsed.y)}}}, scales: {x: {ticks: {maxTicksLimit: 8}}, y: {beginAtZero: true, ticks: metric === 'ordersCreated' ? {precision: 0} : {}}}}} /></div>
					<details className='mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm'><summary className='cursor-pointer text-blue-700'>{t('dash.table')}</summary><div className='max-h-64 overflow-auto mt-3'><table className='w-full text-left'><thead><tr><th scope='col' className='p-2'>{t('dash.day')}</th><th scope='col' className='p-2'>{t('dash.createdOrders')}</th><th scope='col' className='p-2'>{t('dash.paidValue')}</th></tr></thead><tbody>{data.days.map(day => <tr key={day.date} className='border-t'><th scope='row' className='p-2 font-normal'>{day.date}</th><td className='p-2'>{day.ordersCreated}</td><td className='p-2'>{formatCurrency(day.paidOrderValue)}</td></tr>)}</tbody></table></div></details>
				</section>
				<div className='min-w-0 space-y-4'>
					<section aria-labelledby='dashboard-stock-title' className='border border-slate-200 bg-white rounded-xl p-5 text-slate-900'>
						<h2 id='dashboard-stock-title' className='mb-3 flex items-center gap-2 text-lg font-semibold'><span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600'><FiPackage aria-hidden='true' size={18} /></span>{t('dash.stock')}</h2>
						<p className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700'>{t('dash.totalStock')}<strong className={`min-w-10 rounded-md px-3 py-1 text-center tabular-nums ${data.catalog.totalStockUnits > 0 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>{t('dash.stockUnits', {count: data.catalog.totalStockUnits?.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') ?? '-'})}</strong></p>
						<p className='mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700'>{t('dash.outStock')}<strong className={`min-w-10 rounded-md px-3 py-1 text-center tabular-nums ${data.catalog.outOfStockVariants > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-800'}`}>{data.catalog.outOfStockVariants}</strong></p>
						<p className='mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700'>{t('dash.lowStock')}<strong className={`min-w-10 rounded-md px-3 py-1 text-center tabular-nums ${data.catalog.lowStockVariants > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'}`}>{data.catalog.lowStockVariants}</strong></p>
						<p className='mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700'>{t('dash.withoutVariants')}<strong className={`min-w-10 rounded-md px-3 py-1 text-center tabular-nums ${data.catalog.productsWithoutVariants > 0 ? 'bg-violet-100 text-violet-900' : 'bg-slate-200 text-slate-800'}`}>{data.catalog.productsWithoutVariants ?? '-'}</strong></p>
						<Link to='/admin/products' className='mt-4 inline-flex items-center gap-2 rounded text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'>{t('dash.manageProducts')}<FiArrowRight aria-hidden='true' /></Link>
					</section>
					<section aria-labelledby='dashboard-catalog-title' className='rounded-xl border border-slate-200 bg-white p-5 text-slate-900'>
						<h2 id='dashboard-catalog-title' className='mb-3 flex items-center gap-2 text-lg font-semibold'><span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600'><FiLayers aria-hidden='true' size={18} /></span>{t('dash.catalog')}</h2>
						<div className='grid grid-cols-2 gap-3'>
							<Link to='/admin/users' className='relative isolate min-w-0 overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-blue-700 bg-white bg-gradient-to-br from-blue-50 to-white p-3 hover:border-blue-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><span className='block text-xs leading-relaxed text-slate-600'>{t('dash.customers')}</span><strong className='mt-1 block text-2xl text-blue-800 tabular-nums'>{data.catalog.customers}</strong><FiUsers aria-hidden='true' className='pointer-events-none absolute bottom-3 right-3 -z-10 text-blue-700/20' size={26} /></Link>
							<p className='relative isolate min-w-0 overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-emerald-700 bg-white bg-gradient-to-br from-emerald-50 to-white p-3'><span className='block text-xs leading-relaxed text-slate-600'>{t('dash.activeCustomers')}</span><strong className='mt-1 block text-2xl text-emerald-800 tabular-nums'>{data.catalog.activeCustomers}</strong><FiUserCheck aria-hidden='true' className='pointer-events-none absolute bottom-3 right-3 -z-10 text-emerald-700/20' size={26} /></p>
							<Link to='/admin/products' className='relative isolate min-w-0 overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-orange-700 bg-white bg-gradient-to-br from-orange-50 to-white p-3 hover:border-blue-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><span className='block text-xs leading-relaxed text-slate-600'>{t('admin.totalProducts')}</span><strong className='mt-1 block text-2xl text-orange-800 tabular-nums'>{data.catalog.products}</strong><FiPackage aria-hidden='true' className='pointer-events-none absolute bottom-3 right-3 -z-10 text-orange-700/20' size={26} /></Link>
							<Link to='/admin/categories' className='relative isolate min-w-0 overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-pink-700 bg-white bg-gradient-to-br from-pink-50 to-white p-3 hover:border-blue-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><span className='block text-xs leading-relaxed text-slate-600'>{t('admin.totalCategories')}</span><strong className='mt-1 block text-2xl text-pink-800 tabular-nums'>{data.catalog.categories}</strong><FiLayers aria-hidden='true' className='pointer-events-none absolute bottom-3 right-3 -z-10 text-pink-700/20' size={26} /></Link>
						</div>
					</section>
				</div>
			</div>
		</>}
	</div>;
};
export default Dashboard;
