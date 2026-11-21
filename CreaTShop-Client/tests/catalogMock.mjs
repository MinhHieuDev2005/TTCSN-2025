export const isCatalogRequest = request => /\/products(?:\/search)?$/.test(new URL(request.url()).pathname);

export function catalogData(request, products) {
  const url = new URL(request.url());
  if (!url.pathname.endsWith('/products/search')) return products;
  const params = url.searchParams;
  const normalize = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd');
  const ids = (params.get('categoryIds') || '').split(',').filter(Boolean).map(Number);
  const query = normalize(params.get('q') || '');
  const matches = products.filter(product => normalize(product.name).includes(query) && (!ids.length || ids.includes(product.categoryId)));
  if (params.get('sort') === 'asc') matches.sort((left, right) => left.price - right.price);
  if (params.get('sort') === 'desc') matches.sort((left, right) => right.price - left.price);
  const page = Number(params.get('page') || 1), size = Number(params.get('size') || 12);
  return {items: matches.slice((page - 1) * size, page * size), totalItems: matches.length, page, size,
    mode: query ? 'keyword' : 'catalog', fallbackReason: null, appliedFilters: {}};
}
