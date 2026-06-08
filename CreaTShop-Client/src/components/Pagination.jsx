/* eslint-disable react/prop-types */
import {useMemo} from 'react';
import {useLanguage} from '../i18n/LanguageContext';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 40];

const Pagination = ({
	currentPage,
	onPageChange,
	onPageSizeChange,
	pageSize,
	pageSizeOptions = PAGE_SIZE_OPTIONS,
	totalItems,
	totalPages,
}) => {
	const {t} = useLanguage();

	const visiblePages = useMemo(() => {
		if (totalPages <= 7) {
			return Array.from({length: totalPages}, (_, index) => index + 1);
		}

		const pages = [1];
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		if (start > 2) pages.push('left-ellipsis');
		for (let page = start; page <= end; page += 1) {
			pages.push(page);
		}
		if (end < totalPages - 1) pages.push('right-ellipsis');
		pages.push(totalPages);

		return pages;
	}, [currentPage, totalPages]);

	if (totalItems === 0) return null;

	const startItem = (currentPage - 1) * pageSize + 1;
	const endItem = Math.min(currentPage * pageSize, totalItems);

	return (
		<div className='mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
			<p className='text-sm text-gray-600'>
				{t('pagination.summary', {start: startItem, end: endItem, total: totalItems})}
			</p>

			<div className='flex flex-wrap items-center gap-2'>
				{onPageSizeChange && (
					<label className='flex items-center gap-2 text-sm text-gray-600'>
						<span>{t('pagination.itemsPerPage')}</span>
						<select
							value={pageSize}
							onChange={(event) => onPageSizeChange(Number(event.target.value))}
							className='border rounded px-2 py-2 bg-white'
						>
							{pageSizeOptions.map((option) => (
								<option key={option} value={option}>{option}</option>
							))}
						</select>
					</label>
				)}

				<button
					type='button'
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className='px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{t('common.previous')}
				</button>

				<div className='flex items-center gap-1'>
					{visiblePages.map((page, index) => {
						if (typeof page === 'string') {
							return <span key={`${page}-${index}`} className='px-2 py-2 text-gray-500'>...</span>;
						}

						return (
							<button
								key={page}
								type='button'
								onClick={() => onPageChange(page)}
								aria-label={t('pagination.page', {page})}
								className={`px-3 py-2 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
							>
								{page}
							</button>
						);
					})}
				</div>

				<button
					type='button'
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className='px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{t('common.next')}
				</button>
			</div>
		</div>
	);
};

export default Pagination;
