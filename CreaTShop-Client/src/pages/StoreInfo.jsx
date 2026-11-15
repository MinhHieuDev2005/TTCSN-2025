import {Link} from 'react-router-dom';
import {TbArrowRight, TbClock, TbMail, TbMapPin, TbMessageCircle, TbPackage, TbPlus} from 'react-icons/tb';
import useAuth from '../hook/useAuth';
import {useChatNotifications} from '../components/ChatNotifications';
import {useLanguage} from '../i18n/LanguageContext';

const StoreInfo = () => {
    const {t} = useLanguage();
    const {user} = useAuth();
    const {count} = useChatNotifications();
    const admin = user?.roles?.includes('ROLE_ADMIN');
    const chatLabel = t(admin ? 'contact.openInbox' : 'chat.title');
    const unreadLabel = t(admin ? 'chat.unreadThreads' : 'chat.unreadMessages', {count});
    const ordersPath = admin ? '/admin/orders' : '/my-order';
    const ordersLabel = t(admin ? 'contact.manageOrders' : 'payment.viewOrders');

    return <div className='mx-auto max-w-6xl px-4 pb-14 pt-4 text-gray-900 sm:pb-16 sm:pt-7'>
        <header className='journal-entry mb-8 grid items-end gap-5 sm:mb-10 lg:grid-cols-2 lg:gap-0'>
            <div>
                <h1 className='max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight text-gray-950 sm:text-5xl'>{t('contact.title')}</h1>
            </div>
            <p className='max-w-lg text-base leading-7 text-gray-600 lg:pl-10'>{t('contact.intro')}</p>
        </header>

        <div className='journal-entry grid border-y border-stone-200 lg:grid-cols-2'>
            <section aria-labelledby='support-chat' className='relative isolate overflow-hidden bg-stone-50 p-6 sm:p-8 lg:row-span-4 lg:grid lg:grid-rows-[subgrid] lg:p-10'>
                <div aria-hidden='true' className='pointer-events-none absolute inset-y-0 right-0 -z-10 w-28 opacity-60' style={{backgroundImage: 'radial-gradient(#d6d3d1 1px, transparent 1px)', backgroundSize: '12px 12px'}} />
                <div className='mb-8 flex items-center gap-3'><TbMessageCircle aria-hidden='true' className='text-2xl text-blue-700' /><span className='text-xs font-semibold uppercase tracking-[0.15em] text-gray-500'>{t('contact.chatEyebrow')}</span></div>
                <h2 id='support-chat' className='text-2xl font-semibold leading-tight tracking-tight sm:text-3xl'>{t('contact.chatHeading')}</h2>
                <p className='mb-7 mt-4 text-sm leading-7 text-gray-600'>{t('contact.chatBody')}</p>
                <div>
                <Link to={admin ? '/admin/chat' : '/chat'} aria-label={count ? `${chatLabel}, ${unreadLabel}` : chatLabel} className='inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700'><TbMessageCircle aria-hidden='true' className='text-lg' />{chatLabel}{count > 0 && <span aria-hidden='true' className='min-w-6 rounded-full bg-amber-300 px-1.5 py-0.5 text-center text-xs font-bold text-blue-950'>{count > 99 ? '99+' : count}</span>}<TbArrowRight aria-hidden='true' /></Link>
                <p className='mt-4 text-xs leading-5 text-gray-500'>{t(admin ? 'contact.adminChatHint' : user?.token ? 'contact.savedChatHint' : 'contact.signInHint')}</p>
                </div>
            </section>
            <section aria-labelledby='support-orders' className='border-t border-stone-200 px-6 py-8 sm:px-8 lg:row-span-4 lg:grid lg:grid-rows-[subgrid] lg:border-l lg:border-t-0 lg:p-10'>
                <div className='mb-8 flex items-center gap-3'><TbPackage aria-hidden='true' className='text-2xl text-gray-600' /><span className='text-xs font-semibold uppercase tracking-[0.15em] text-gray-500'>{t('contact.ordersEyebrow')}</span></div>
                <h2 id='support-orders' className='text-2xl font-semibold leading-tight tracking-tight sm:text-3xl'>{t('contact.ordersHeading')}</h2>
                <p className='mb-7 mt-4 text-sm leading-7 text-gray-600'>{t('contact.ordersBody')}</p>
                <div><Link to={ordersPath} className='inline-flex min-h-12 w-fit items-center gap-3 border-b border-gray-900 text-sm font-semibold underline-offset-4 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'>{ordersLabel}<TbArrowRight aria-hidden='true' /></Link></div>
            </section>
        </div>

        <div className='journal-entry mt-12 grid gap-y-10 lg:grid-cols-2 lg:gap-y-0'>
            <section aria-labelledby='support-questions' className='px-6 sm:px-8 lg:row-span-3 lg:grid lg:grid-rows-[subgrid] lg:px-10'>
                <p className='mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500'>{t('contact.faqEyebrow')}</p>
                <h2 id='support-questions' className='mb-5 font-sans text-2xl font-semibold leading-tight tracking-normal sm:text-3xl'>{t('contact.faqHeading')}</h2>
                <div>{[
                    ['size', '/news/chon-size-giay', t('news.size.title')],
                    ['order', ordersPath, ordersLabel],
                    ['payment', '/news/dat-hang-va-theo-doi-don', t('news.order.title')],
                ].map(([topic, to, label]) => <details key={topic} className='group border-b border-gray-200'>
                    <summary className='flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden'>{t(`contact.faq.${topic}.question`)}<TbPlus aria-hidden='true' className='shrink-0 text-lg text-gray-500 group-open:rotate-45' /></summary>
                    <div className='pb-5 pr-4 text-sm leading-7 text-gray-600'><p>{t(`contact.faq.${topic}.answer`)}</p><Link to={to} className='mt-2 inline-flex min-h-11 items-center gap-2 font-medium text-gray-900 underline underline-offset-4 focus-visible:outline-gray-900'>{label}<TbArrowRight aria-hidden='true' /></Link></div>
                </details>)}</div>
            </section>
            <aside aria-labelledby='support-information' className='border-t border-stone-200 px-6 pt-8 sm:px-8 lg:row-span-3 lg:grid lg:grid-rows-[subgrid] lg:border-l lg:border-t-0 lg:px-10 lg:pt-0'>
                <p className='mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500'>CREAT</p>
                <h2 id='support-information' className='mb-5 font-sans text-2xl font-semibold leading-tight tracking-normal sm:text-3xl'>{t('contact.information')}</h2>
                <div><dl className='space-y-4 text-sm'>
                    {[[TbMail, 'contact.email', 'support@creat.com'], [TbClock, 'contact.hours', t('footer.hours')], [TbMapPin, 'contact.address', t('contact.location')]].map(([Icon, label, value]) => <div key={label}>
                        <dt className='mb-1.5 flex items-center gap-2 text-gray-500'><Icon aria-hidden='true' className='text-lg' />{t(label)}</dt>
                        <dd className='pl-7 leading-6 text-gray-900'>{label === 'contact.email' ? <a href='mailto:support@creat.com' className='inline-flex min-h-11 items-center break-all underline underline-offset-4 hover:text-gray-600 focus-visible:outline-gray-900'>{value}</a> : value}</dd>
                    </div>)}
                </dl>
                <p className='mt-7 border-t border-gray-200 pt-5 text-xs leading-6 text-gray-500'>{t('contact.orderHelp')}</p>
                </div>
            </aside>
        </div>
    </div>;
};

export default StoreInfo;
