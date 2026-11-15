import {Link} from 'react-router-dom';
import {TbArrowRight, TbMessageCircle} from 'react-icons/tb';
import {useLanguage} from '../i18n/LanguageContext';
import logo from '../assets/creat-logo-dark.png';

const Footer = () => {
    const {t} = useLanguage();
    return <footer className='w-full border-t border-neutral-800 bg-neutral-950 text-gray-300'>
        <div className='mx-auto max-w-6xl px-4 pb-20 pt-9 sm:pb-7'>
            <div className='grid gap-8 md:grid-cols-[1.2fr_1fr_1fr] md:gap-12'>
                <div>
                    <Link to='/' className='inline-flex focus-visible:outline-red-300'><img src={logo} alt='CreaT' width={720} height={240} loading='lazy' className='h-12 w-36 object-contain' /></Link>
                    <div className='mt-4 space-y-2 text-sm leading-6'><p>{t('footer.location')}</p><p>{t('footer.tel')}</p><p>{t('footer.hours')}</p></div>
                    <a href='mailto:support@creat.com' className='mt-2 inline-flex min-h-11 items-center text-sm text-red-300 underline-offset-4 hover:underline focus-visible:outline-red-300'>support@creat.com</a>
                </div>
                <nav aria-label={t('footer.explore')}>
                    <h2 className='mb-3 font-semibold text-white'>{t('footer.explore')}</h2>
                    <ul>{[['/shop', 'nav.shop'], ['/news', 'news.title'], ['/cart', 'footer.viewCart'], ['/my-order', 'footer.trackOrder']].map(([to, label]) => <li key={to}><Link to={to} className='inline-flex min-h-11 items-center text-sm hover:text-red-300 hover:underline focus-visible:outline-red-300'>{t(label)}</Link></li>)}</ul>
                </nav>
                <div>
                    <h2 className='mb-4 font-semibold text-white'>{t('footer.helpTitle')}</h2>
                    <p className='text-sm leading-6'>{t('footer.helpBody')}</p>
                    <Link to='/chat' className='mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300'><TbMessageCircle aria-hidden='true' />{t('chat.title')}</Link>
                    <Link to='/contact' className='mt-2 flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-red-300 hover:underline focus-visible:outline-red-300'>{t('nav.contact')}<TbArrowRight aria-hidden='true' /></Link>
                </div>
            </div>
            <p className='mt-7 border-t border-neutral-800 pt-5 text-xs text-gray-400'>&copy; {new Date().getFullYear()} CreaT / NguyenMinhHieu</p>
        </div>
    </footer>;
};

export default Footer;
