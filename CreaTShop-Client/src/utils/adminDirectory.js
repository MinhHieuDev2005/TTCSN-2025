export function selectCategories(categories, {query = '', type = ''} = {}) {
	const search = query.trim().toLocaleLowerCase();
	return categories.filter(category => (!type || category.type === type)
		&& (!search || category.name.toLocaleLowerCase().includes(search)))
		.sort((left, right) => right.id - left.id);
}

export function selectUsers(users, {query = '', status = '', role = ''} = {}) {
	const search = query.trim().toLocaleLowerCase();
	return users.filter(user => (!status || user.status === status) && (!role || user.role === role)
		&& (!search || [user.username, user.email, user.phoneNumber, `${user.firstName || ''} ${user.lastName || ''}`]
			.some(value => String(value || '').toLocaleLowerCase().includes(search))))
		.sort((left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
			|| String(left.username).localeCompare(String(right.username)));
}
