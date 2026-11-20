/* eslint-disable react/prop-types */
import {useEffect, useState} from 'react';
import axios from 'axios';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import CardList from './CardList';

export default function Recommendations({productId}) {
  const {user} = useAuth();
  const {t} = useLanguage();
  const [result, setResult] = useState(null);
  const token = user?.token || '';
  const endpoint = productId ? `/products/${productId}/similar` : token ? '/recommendations/me' : '/recommendations/popular';
  const identity = `${endpoint}:${token}`;

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      signal: controller.signal,
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    }).then(response => {
      if (!controller.signal.aborted) setResult({identity, ...response.data.data});
    }).catch(() => {
      if (!controller.signal.aborted) setResult(null);
    });
    return () => controller.abort();
  }, [endpoint, token, identity]);

  if (result?.identity !== identity || !result.items?.length) return null;
  return <section className="container mx-auto my-10 px-4 sm:px-6 md:px-10 lg:px-20" aria-label={t(`discovery.${result.mode}`)}>
    <h2 className="mb-6 text-center text-2xl font-bold">{t(`discovery.${result.mode}`)}</h2>
    <CardList products={result.items} />
  </section>;
}
