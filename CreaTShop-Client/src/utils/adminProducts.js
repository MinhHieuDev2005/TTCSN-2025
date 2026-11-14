export function selectProductRows(products, filters = {}) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  const min = filters.minPrice === '' || filters.minPrice == null ? 0 : Number(filters.minPrice);
  const max = filters.maxPrice === '' || filters.maxPrice == null ? Infinity : Number(filters.maxPrice);
  if (!Number.isFinite(min) || Number.isNaN(max) || min < 0 || max < min) return [];
  return products.map((product) => {
    const variants = product.variants || [];
    const productMatches = !query || String(product.name ?? '').toLocaleLowerCase().includes(query)
      || String(product.id) === query.replace(/^#/, '');
    const matches = (variants.length ? variants : [null]).filter((variant) => {
      const quantity = Number(variant?.quantity ?? 0);
      return (productMatches || [variant?.color, variant?.size].some((value) => String(value ?? '').toLocaleLowerCase().includes(query))
          || (variant?.id != null && String(variant.id) === query.replace(/^#/, '')))
        && (!filters.color || variant?.color === filters.color)
        && (!filters.size || variant?.size === filters.size)
        && (!filters.stock || (filters.stock === 'in' && quantity > 0)
          || (filters.stock === 'out' && quantity === 0)
          || (filters.stock === 'low' && quantity > 0 && quantity <= 5));
    });
    return {product, matches: matches.length, matchingVariantCount: matches.filter(Boolean).length,
      totalStock: variants.reduce((total, variant) => total + Number(variant.quantity ?? 0), 0)};
  }).filter(({product, matches}) => {
      const price = Number(product.price);
      return matches > 0
        && (!filters.categoryId || String(product.categoryId) === filters.categoryId)
        && Number.isFinite(price) && price >= min && price <= max;
    }).sort((left, right) => {
      if (filters.sort === 'price-asc') return left.product.price - right.product.price || right.product.id - left.product.id;
      if (filters.sort === 'price-desc') return right.product.price - left.product.price || right.product.id - left.product.id;
      if (filters.sort === 'stock-asc') return left.totalStock - right.totalStock || right.product.id - left.product.id;
      return right.product.id - left.product.id;
    });
}
