export function priceRangeError(prices) {
  const values = [prices.minPrice.trim(), prices.maxPrice.trim()];
  if (values.some(value => value !== '' && (!/^\d+$/.test(value) || Number(value) > 999999999999999))) return 'shop.invalidPrice';
  return values.every(value => value !== '') && Number(values[0]) > Number(values[1]) ? 'shop.invalidPriceRange' : '';
}

export function categorySections(categories) {
  const sections = {productTypes: [], collections: [], general: []};
  for (const category of categories) {
    const name = category.name.trim().toLocaleLowerCase('vi');
    const section = ['hunter', 'gosto', 'êmbrace'].includes(name) ? 'collections'
      : /^(giày|dép|sandal)(\s|$)/u.test(name) ? 'productTypes' : 'general';
    sections[section].push(category);
  }
  return Object.entries(sections).filter(([, items]) => items.length).map(([label, items]) => ({label, items}));
}
