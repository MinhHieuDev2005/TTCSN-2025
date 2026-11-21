import {Link} from 'react-router-dom';
import {TbArrowRight, TbClock, TbMail, TbMapPin, TbMessageCircle, TbPhone} from 'react-icons/tb';
import {useLanguage} from '../i18n/LanguageContext';
import logo from '../assets/creat-logo-dark.png';

const Footer = () => {
    const {t} = useLanguage();
    return <footer className='w-full border-t-4 border-red-700 bg-[#191817] text-stone-300'>
        <div className='mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-5'>
            <div className='flex flex-col gap-4 border-b border-white/15 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10'>
                <div className='max-w-xl'>
                    <h2 className='text-xl font-semibold tracking-tight text-stone-50 sm:text-2xl'>{t('footer.helpTitle')}</h2>
                    <p className='mt-2 text-sm leading-6 text-stone-400'>{t('footer.helpBody')}</p>
                </div>
                <div className='flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3'>
                    <Link to='/chat' className='inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300'><TbMessageCircle className='text-lg' aria-hidden='true' />{t('chat.title')}</Link>
                    <Link to='/contact' className='inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-200 underline-offset-4 hover:text-white hover:underline focus-visible:outline-stone-200'>{t('nav.contact')}<TbArrowRight aria-hidden='true' /></Link>
                </div>
            </div>
            <div className='grid gap-6 py-6 sm:grid-cols-2 lg:grid-cols-[1fr_0.85fr_1.15fr] lg:gap-10'>
                <div className='sm:col-span-2 lg:col-span-1'>
                    <Link to='/' className='inline-flex focus-visible:outline-stone-200'><img src={logo} alt='CreaT' width={720} height={240} loading='lazy' className='h-10 w-[120px] object-contain' /></Link>
                    <p className='mt-3 flex items-start gap-3 text-sm leading-6 text-stone-400'><TbClock className='mt-1 shrink-0 text-base' aria-hidden='true' /><span>{t('footer.hours')}</span></p>
                </div>
                <nav aria-label={t('footer.explore')}>
                    <h2 className='mb-3 text-sm font-semibold text-stone-50'>{t('footer.explore')}</h2>
                    <ul className='grid grid-cols-2 gap-x-4 sm:block'>{[['/shop', 'nav.shop'], ['/news', 'news.title'], ['/cart', 'footer.viewCart'], ['/my-order', 'footer.trackOrder']].map(([to, label]) => <li key={to}><Link to={to} className='inline-flex min-h-11 items-center text-sm underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-stone-200'>{t(label)}</Link></li>)}</ul>
                </nav>
                <div>
                    <h2 className='mb-3 text-sm font-semibold text-stone-50'>{t('nav.contact')}</h2>
                    <address className='text-sm not-italic leading-6'>
                        <p className='flex min-h-11 items-start gap-3 py-2'><TbMapPin className='mt-1 shrink-0 text-base text-stone-400' aria-hidden='true' /><span>{t('footer.location')}</span></p>
                        <p className='flex min-h-11 items-start gap-3 py-2'><TbPhone className='mt-1 shrink-0 text-base text-stone-400' aria-hidden='true' /><span>{t('footer.tel')}</span></p>
                        <a href='mailto:support@creat.com' className='flex min-h-11 w-fit items-center gap-3 break-all underline-offset-4 hover:text-white hover:underline focus-visible:outline-stone-200'><TbMail className='shrink-0 text-base text-stone-400' aria-hidden='true' />support@creat.com</a>
                    </address>
                </div>
            </div>
            <p className='border-t border-white/15 pt-4 text-xs leading-6 text-stone-400'>&copy; {new Date().getFullYear()} CreaT / NguyenMinhHieu</p>
        </div>
    </footer>;
};

export default Footer;
