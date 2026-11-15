import {Link, useParams} from 'react-router-dom';
import {TbArrowLeft, TbArrowRight, TbBook2, TbMessageCircle} from 'react-icons/tb';
import {useLanguage} from '../i18n/LanguageContext';
import PropTypes from 'prop-types';
import sizeImage from '../assets/journal-size.svg';
import careImage from '../assets/journal-care.svg';
import orderImage from '../assets/journal-order.svg';

// ponytail: three bundled guides; add an articles API when staff need publishing tools.
const articles = [
    {slug: 'chon-size-giay', topic: 'size', image: sizeImage, imageBackground: 'bg-stone-100', sections: ['measure', 'compare', 'choose']},
    {slug: 'cham-soc-giay', topic: 'care', image: careImage, imageBackground: 'bg-emerald-50', sections: ['prepare', 'clean', 'store']},
    {slug: 'dat-hang-va-theo-doi-don', topic: 'order', image: orderImage, imageBackground: 'bg-amber-50', sections: ['check', 'pay', 'track']},
];

ArticleCard.propTypes = {article: PropTypes.object.isRequired, featured: PropTypes.bool};

function ArticleCard({article, featured = false}) {
    const {t} = useLanguage();
    return <article className={`journal-entry min-w-0 ${featured ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}`}>
        <Link to={`/news/${article.slug}`} aria-labelledby={`article-${article.topic}`} className={`group flex h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:shadow-gray-950/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700 ${featured ? 'flex-col' : 'flex-col sm:flex-row'}`}>
            <div className={`relative shrink-0 overflow-hidden ${article.imageBackground} ${featured ? 'aspect-[2/1]' : 'aspect-[2/1] sm:aspect-auto sm:w-2/5'}`}>
                <img src={article.image} alt={t(`news.${article.topic}.imageAlt`)} width='960' height='640' loading={featured ? 'eager' : 'lazy'} className={`h-full w-full ${featured ? 'object-cover' : 'object-contain'}`} />
                {featured && <span className='absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm'><TbBook2 aria-hidden='true' />{t('news.featured')}</span>}
            </div>
            <div className={`flex min-w-0 flex-1 flex-col ${featured ? 'p-6 sm:p-8' : 'p-5 sm:p-6'}`}>
                <p className='mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600'>{t(`news.${article.topic}.category`)}</p>
                <h2 id={`article-${article.topic}`} className={`font-semibold leading-tight text-gray-950 group-hover:text-gray-600 ${featured ? 'font-serif text-3xl sm:text-4xl' : 'text-xl'}`}>{t(`news.${article.topic}.title`)}</h2>
                <p className='mb-5 mt-3 text-sm leading-6 text-gray-600'>{t(`news.${article.topic}.summary`)}</p>
                <span className='mt-auto inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-gray-900 underline-offset-4 group-hover:underline'>{t('news.read')}<TbArrowRight aria-hidden='true' /></span>
            </div>
        </Link>
    </article>;
}

export default function News() {
    const {slug} = useParams();
    const {t} = useLanguage();
    const article = articles.find(item => item.slug === slug);
    if (slug && !article) return <section className='mx-auto max-w-3xl px-4 py-16 text-center'>
        <TbBook2 aria-hidden='true' className='mx-auto mb-5 text-4xl text-gray-600' />
        <h1 className='font-serif text-3xl font-semibold text-gray-950'>{t('news.notFound')}</h1>
        <p className='mt-4 text-gray-600'>{t('news.notFoundBody')}</p>
        <Link to='/news' className='mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-5 text-white focus-visible:outline-red-700'><TbArrowLeft aria-hidden='true' />{t('news.back')}</Link>
    </section>;

    return <div className='mx-auto max-w-6xl px-4 pb-12 text-gray-900 sm:pb-16'>
        {article ? <>
            <Link to='/news' className='mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-600 hover:underline focus-visible:outline-red-700'><TbArrowLeft aria-hidden='true' />{t('news.back')}</Link>
            <div className='grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14'>
                <article className='min-w-0'>
                    <header className='mb-7'>
                        <p className='mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600'>{t(`news.${article.topic}.category`)}</p>
                        <h1 className='font-serif text-4xl font-semibold leading-tight text-gray-950 sm:text-5xl'>{t(`news.${article.topic}.title`)}</h1>
                        <p className='mt-5 text-lg leading-8 text-gray-600'>{t(`news.${article.topic}.summary`)}</p>
                    </header>
                    <img src={article.image} alt={t(`news.${article.topic}.imageAlt`)} width='960' height='640' className={`mb-9 aspect-[2/1] w-full rounded-2xl object-cover ${article.imageBackground}`} />
                    <p className='mb-9 whitespace-pre-line border-l-2 border-gray-300 pl-5 text-base leading-8 text-gray-700'>{t(`news.${article.topic}.body`)}</p>
                    {article.sections.map(section => <section key={section} id={section} className='mb-9 scroll-mt-44'>
                        <h2 className='mb-4 text-xl font-semibold text-gray-950'>{t(`news.${article.topic}.${section}.title`)}</h2>
                        {t(`news.${article.topic}.${section}.body`).split('\n\n').map(paragraph => <p key={paragraph} className='mb-4 text-base leading-8 text-gray-600'>{paragraph}</p>)}
                    </section>)}
                    <Link to={article.topic === 'order' ? '/my-order' : '/shop'} className='inline-flex min-h-12 items-center gap-3 rounded-lg bg-red-700 px-5 font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700'>{t(article.topic === 'order' ? 'payment.viewOrders' : 'news.visitShop')}<TbArrowRight aria-hidden='true' /></Link>
                </article>
                <aside className='rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:sticky lg:top-28'>
                    <nav aria-label={t('news.contents')}>
                        <h2 className='mb-4 font-semibold'>{t('news.contents')}</h2>
                        <ul className='space-y-1'>{article.sections.map(section => <li key={section}><a href={`#${section}`} className='inline-flex min-h-11 items-center text-sm leading-6 text-gray-600 underline-offset-4 hover:text-gray-600 hover:underline focus-visible:outline-red-700'>{t(`news.${article.topic}.${section}.title`)}</a></li>)}</ul>
                    </nav>
                    <div className='mt-5 border-t border-gray-200 pt-5'><p className='text-sm leading-6 text-gray-600'>{t('news.help')}</p><Link to='/contact' className='mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-gray-600'>{t('nav.contact')}<TbArrowRight aria-hidden='true' /></Link></div>
                </aside>
            </div>
            <section className='mt-14 border-t border-gray-200 pt-8' aria-labelledby='related-guides'>
                <h2 id='related-guides' className='mb-6 font-serif text-2xl font-semibold'>{t('news.related')}</h2>
                <div className='grid gap-5 lg:grid-cols-10'>{articles.filter(item => item.slug !== slug).map(item => <ArticleCard key={item.slug} article={item} />)}</div>
            </section>
        </> : <>
            <header className='mb-8 border-b border-gray-200 pb-7 pt-3 sm:mb-10 sm:pb-9'>
                <h1 className='font-serif text-4xl font-semibold leading-tight tracking-tight text-gray-950 sm:text-5xl'>{t('news.title')}</h1>
                <p className='mt-4 max-w-2xl text-base leading-7 text-gray-600'>{t('news.intro')}</p>
            </header>
            <section aria-label={t('news.guides')} className='grid items-stretch gap-5 lg:grid-cols-12'>
                {articles.map((item, index) => <ArticleCard key={item.slug} article={item} featured={index === 0} />)}
            </section>
            <div className='mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-6 py-4'>
                <p className='flex items-center gap-3 text-sm text-gray-600'><TbMessageCircle aria-hidden='true' className='shrink-0 text-xl text-gray-600' />{t('news.help')}</p>
                <Link to='/contact' className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-900 hover:underline focus-visible:outline-red-700'>{t('nav.contact')}<TbArrowRight aria-hidden='true' /></Link>
            </div>
        </>}
    </div>;
}
