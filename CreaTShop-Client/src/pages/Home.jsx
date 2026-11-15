import useBackgroundRefresh from '../hook/useBackgroundRefresh';
import SyncNotice from '../components/SyncNotice';
import Slider from '../components/Slider/Slider';
import CardList from '../components/CardList';
import CategoryCard from '../components/CategoryCard/CategoryCard';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Loading from '../components/Loading';
import {useLanguage} from '../i18n/LanguageContext';

const Home = () => {
  const [randomProducts, setRandomProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const {t} = useLanguage();

  const getAllProducts = useCallback(async (signal, background = false) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`, {signal});
      if (signal?.aborted) return;
      const allProducts = res.data.data;
      setRandomProducts(previous => {
        if (!background) return [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 12);
        const catalog = new Map(allProducts.map(item => [item.id, item]));
        const ids = [...new Set([...previous.map(item => item.id), ...catalog.keys()])];
        return ids.filter(id => catalog.has(id)).slice(0, 12).map(id => catalog.get(id));
      });
    } catch (error) {
      if (signal?.aborted) return;
      if (background) throw error;
      console.error(error);
    } finally {
      if (!background && !signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    getAllProducts(controller.signal);
    return () => controller.abort();
  }, [getAllProducts]);
  const syncDelayed = useBackgroundRefresh(signal => getAllProducts(signal, true), !loading);

  return (
    <div>
      <SyncNotice stale={syncDelayed} />
      {loading && <Loading />}
      <div className="">
        <Slider />
      </div>
      <h1 className="text-center text-3xl font-bold mb-10">{t('home.title')}</h1>

      <div className="container mx-auto px-4">
        <h3 className="text-center text-2xl font-bold mb-10">{t('home.categories')}</h3>
        <CategoryCard />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-10 lg:px-20 mb-10">
        <h3 className="text-center text-2xl font-bold mb-10">{t('home.featuredProducts')}</h3>
        {loading ? (
          <Loading />
        ) : (
          <CardList products={randomProducts} />
        )}
      </div>
    </div>
  );
};

export default Home;
