import {useEffect, useMemo, useState} from 'react';

const useClientPagination = (items = [], initialPageSize = 10) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

	useEffect(() => {
		setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
	}, [totalPages]);

	const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
	const endIndex = Math.min(startIndex + pageSize, totalItems);

	const paginatedItems = useMemo(
		() => items.slice(startIndex, endIndex),
		[items, startIndex, endIndex]
	);

	const changePageSize = (nextPageSize) => {
		setPageSize(Number(nextPageSize));
		setCurrentPage(1);
	};

	return {
		currentPage,
		endIndex,
		pageSize,
		paginatedItems,
		setCurrentPage,
		setPageSize: changePageSize,
		startIndex,
		totalItems,
		totalPages,
	};
};

export default useClientPagination;
