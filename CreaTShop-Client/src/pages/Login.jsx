import {Field, Form, Formik} from 'formik';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {loginCheck} from '../utils/loginCheck';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {completeSocialLogin, login, socialProviders} from '../api/auth.api';
import {save} from '../redux/store/auth.store';
import {useLanguage} from '../i18n/LanguageContext';
import {apiError} from '../utils/apiError';
import {FcGoogle} from 'react-icons/fc';
import {FaFacebook} from 'react-icons/fa';

const returnKey = 'social-login-return';
const allowedReturn = value => typeof value === 'string' && /^\/(?:profile|cart|checkout|my-order|chat|product\/\d+)(?:\?[^#]*)?$/.test(value) ? value : '/';
const socialErrors = new Set(['email_exists', 'email_required', 'email_unverified', 'account_locked']);

const Login = () => {
    const location = useLocation();
    const dispatch = useDispatch();
    const token = useSelector(state => state.auth.auth?.token);
    const {t} = useLanguage();
    const [params] = useSearchParams();
    const result = params.get('social');
    const reason = params.get('reason');
    const [providers, setProviders] = useState([]);
    const [providersUnavailable, setProvidersUnavailable] = useState(false);
    const [socialBusy, setSocialBusy] = useState(result === 'success');
    const [socialError, setSocialError] = useState('');

    const finishLogin = useCallback(async (data, requestedFrom) => {
        if (!data?.accessToken || typeof data.roles !== 'string') throw new Error(t('auth.tokenMissing'));
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {headers: {Authorization: `Bearer ${data.accessToken}`}});
        const user = response.data.data;
        if (!user?.id) throw new Error(t('auth.loginFailed'));
        dispatch(save({token: data.accessToken, roles: data.roles, idUser: user.id, firstName: user.firstName,
            lastName: user.lastName, phoneNumber: user.phoneNumber, userName: user.username, email: user.email}));
        window.location.href = data.roles.includes('ROLE_ADMIN') ? '/admin/dashboard' : allowedReturn(requestedFrom);
    }, [dispatch, t]);

    useEffect(() => {
        const controller = new AbortController();
        socialProviders(controller.signal).then(response => {
            if (!controller.signal.aborted) setProviders(Array.isArray(response.data.data) ? response.data.data : []);
        }).catch(() => { if (!controller.signal.aborted) setProvidersUnavailable(true); });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (result === 'error') {
            sessionStorage.removeItem(returnKey);
            setSocialError(t(`auth.social.${socialErrors.has(reason) ? reason : 'login_failed'}`));
            return;
        }
        if (result !== 'success') return;
        let active = true;
        setSocialBusy(true);
        completeSocialLogin().then(async response => {
            if (!active || token === response.data.data?.accessToken) return;
            const requestedFrom = sessionStorage.getItem(returnKey);
            sessionStorage.removeItem(returnKey);
            await finishLogin(response.data.data, requestedFrom);
        }).catch(() => {
            if (active) setSocialError(t('auth.social.expired'));
        }).finally(() => { if (active) setSocialBusy(false); });
        return () => { active = false; };
    }, [result, reason, finishLogin, t, token]);

    const startSocial = provider => {
        if (socialBusy || !providers.some(item => item.id === provider && item.enabled === true)) return;
        setSocialBusy(true);
        setSocialError('');
        sessionStorage.setItem(returnKey, allowedReturn(location.state?.from));
        window.location.assign(new URL(`/oauth2/authorization/${provider}`, new URL(import.meta.env.VITE_API_URL, window.location.origin)).href);
    };

    return <div className='flex w-full justify-center px-4 py-10 sm:py-16'>
        <div className='w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8'>
            <h1 className='mb-6 text-center text-3xl font-bold'>{t('auth.loginTitle')}</h1>
            {socialBusy && <p role='status' className='mb-4 text-center text-sm text-gray-600'>{t('auth.social.processing')}</p>}
            {socialError && <p role='alert' className='mb-4 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800'>{socialError}</p>}
            <Formik initialValues={{username: '', password: ''}} validationSchema={loginCheck(t)} onSubmit={async values => {
                try { await finishLogin((await login(values)).data.data, location.state?.from); }
                catch (error) { toast.error(apiError(error, t('auth.loginFailed'))); }
            }}>
                {({errors, touched, isSubmitting}) => <Form className='space-y-4'>
                    <div>
                        <label htmlFor='login-username' className='mb-1.5 block text-sm font-medium'>{t('auth.username')}</label>
                        <Field id='login-username' type='text' name='username' autoComplete='username' placeholder={t('auth.username')} aria-invalid={Boolean(errors.username && touched.username)} aria-describedby={errors.username && touched.username ? 'login-username-error' : undefined} className='min-h-11 w-full rounded-lg border border-gray-300 px-3 focus:border-red-600 focus:outline-red-600' />
                        {errors.username && touched.username && <p id='login-username-error' className='mt-1 text-sm text-red-700'>{errors.username}</p>}
                    </div>
                    <div>
                        <label htmlFor='login-password' className='mb-1.5 block text-sm font-medium'>{t('auth.password')}</label>
                        <Field id='login-password' type='password' name='password' autoComplete='current-password' placeholder={t('auth.password')} aria-invalid={Boolean(errors.password && touched.password)} aria-describedby={errors.password && touched.password ? 'login-password-error' : undefined} className='min-h-11 w-full rounded-lg border border-gray-300 px-3 focus:border-red-600 focus:outline-red-600' />
                        {errors.password && touched.password && <p id='login-password-error' className='mt-1 text-sm text-red-700'>{errors.password}</p>}
                    </div>
                    <button disabled={isSubmitting || socialBusy} className='min-h-11 w-full rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50' type='submit'>{t('auth.loginButton')}</button>
                </Form>}
            </Formik>
            <div className='my-6 flex items-center gap-3 text-xs text-gray-500'><span className='h-px flex-1 bg-gray-200' /><span>{t('auth.social.or')}</span><span className='h-px flex-1 bg-gray-200' /></div>
            <div className='space-y-3'>
                {[['google', FcGoogle], ['facebook', FaFacebook]].map(([provider, Icon]) => {
                    const enabled = providers.some(item => item.id === provider && item.enabled === true);
                    return <button key={provider} type='button' disabled={!enabled || socialBusy} onClick={() => startSocial(provider)} className='flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50'>
                        <Icon aria-hidden='true' className={`shrink-0 text-xl ${provider === 'facebook' ? 'text-blue-600' : ''}`} />{t(`auth.social.${provider}`)}
                    </button>;
                })}
            </div>
            {(providersUnavailable || providers.some(provider => !provider.enabled)) && <p className='mt-3 text-center text-xs leading-5 text-gray-500'>{t('auth.social.unavailable')}</p>}
            <p className='mt-6 text-center text-sm text-gray-600'>{t('auth.noAccount')}{' '}<Link to='/signup' className='font-medium text-red-700 hover:underline'>{t('auth.signupButton')}</Link></p>
        </div>
    </div>;
};
export default Login;
