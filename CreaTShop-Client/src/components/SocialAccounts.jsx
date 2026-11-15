import {useEffect, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import {FcGoogle} from 'react-icons/fc';
import {FaFacebook} from 'react-icons/fa';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';

const errors = new Set(['reauth_required', 'identity_in_use', 'provider_already_linked', 'email_exists',
    'email_required', 'email_unverified', 'account_locked', 'link_expired', 'provider_unavailable']);
const SocialAccounts = () => {
    const {user, clearUser} = useAuth();
    const {t} = useLanguage();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const result = params.get('link');
    const reason = params.get('reason');
    const [providers, setProviders] = useState([]);
    const [pending, setPending] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [reload, setReload] = useState(0);
    const heading = useRef(null);
    const token = user?.token;
    const endpoint = `${import.meta.env.VITE_API_URL}/auths/social/links`;
    const options = {headers: {Authorization: `Bearer ${token}`}, withCredentials: true};
    const errorCode = code => errors.has(code) ? code : 'failed';

    useEffect(() => {
        const controller = new AbortController();
        const config = {headers: {Authorization: `Bearer ${token}`}, withCredentials: true, signal: controller.signal};
        setLoading(true);
        setPending(null);
        setError(result === 'error' ? errorCode(reason) : '');
        Promise.all([
            axios.get(endpoint, config),
            result === 'confirm' ? axios.get(`${endpoint}/pending`, config) : Promise.resolve(null),
        ]).then(([linked, confirmation]) => {
            if (controller.signal.aborted) return;
            setProviders(linked.data.data);
            setPending(confirmation?.data.data ?? null);
        }).catch(failure => {
            if (!controller.signal.aborted) setError(errorCode(failure.response?.data?.code));
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [endpoint, token, result, reason, reload]);

    useEffect(() => {
        if (result && !loading) heading.current?.focus();
    }, [result, loading]);

    const clearCallback = () => setParams(current => {
        current.delete('link');
        current.delete('reason');
        return current;
    }, {replace: true});
    const start = async provider => {
        setBusy(true);
        setError('');
        setSuccess(false);
        try {
            await axios.post(`${endpoint}/${provider}/start`, {}, options);
            window.location.assign(new URL(`/oauth2/authorization/${provider}?link=1`, new URL(import.meta.env.VITE_API_URL, window.location.origin)).href);
        } catch (failure) {
            setError(errorCode(failure.response?.data?.code));
            setBusy(false);
        }
    };
    const finish = async action => {
        setBusy(true);
        setError('');
        try {
            await axios.post(`${endpoint}/${action}`, {}, options);
            setPending(null);
            setSuccess(action === 'confirm');
            clearCallback();
            setReload(value => value + 1);
        } catch (failure) {
            setError(errorCode(failure.response?.data?.code));
        } finally { setBusy(false); }
    };

    return <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="social-accounts-title">
        <h2 ref={heading} tabIndex={-1} id="social-accounts-title" className="text-xl font-semibold">{t('profile.links.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{t('profile.links.description')}</p>
        {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-green-800">{t('profile.links.success')}</p>}
        {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">
            <p>{t(`profile.links.${error}`)}</p>
            {error === 'reauth_required' ? <button type="button" disabled={busy} onClick={() => {
                clearUser();
                navigate('/login', {state: {from: '/profile'}});
            }} className="mt-2 min-h-11 font-semibold underline">{t('profile.links.reauthenticate')}</button>
                : !pending && <button type="button" disabled={busy} onClick={() => {
                    clearCallback();
                    setReload(value => value + 1);
                }} className="mt-2 min-h-11 font-semibold underline">{t('common.retry')}</button>}
        </div>}
        {loading ? <p role="status" className="mt-4">{t('common.loading')}</p> : pending ? (
            <div className="mt-5 rounded-lg border border-gray-300 bg-gray-50 p-4">
                <h3 className="font-semibold">{t('profile.links.confirmTitle')}</h3>
                <p className="mt-2 break-words font-medium">{pending.provider === 'google' ? 'Google' : 'Facebook'}: {pending.email}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{t('profile.links.confirmDescription')}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled={busy} onClick={() => finish('confirm')} className="min-h-11 rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{t('profile.links.confirm')}</button>
                    <button type="button" disabled={busy} onClick={() => finish('cancel')} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:opacity-50">{t('profile.links.cancel')}</button>
                </div>
            </div>
        ) : <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {providers.map(provider => {
                const Icon = provider.id === 'google' ? FcGoogle : FaFacebook;
                const name = provider.id === 'google' ? 'Google' : 'Facebook';
                return <div key={provider.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <Icon aria-hidden="true" className={`text-2xl ${provider.id === 'facebook' ? 'text-blue-600' : ''}`} />
                        <div><h3 className="font-semibold">{name}</h3><p className="text-sm text-gray-600">{t(`profile.links.${provider.linked ? 'linked' : provider.enabled ? 'notLinked' : 'unavailable'}`)}</p></div>
                    </div>
                    {!provider.linked && <button type="button" disabled={busy || !provider.enabled} onClick={() => start(provider.id)}
                        aria-label={`${t('profile.links.link')} ${name}`} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">{t('profile.links.link')}</button>}
                </div>;
            })}
        </div>}
    </section>;
};

export default SocialAccounts;
