import {useCallback, useEffect, useState} from 'react';
import {ErrorMessage, Field, Form, Formik} from 'formik';
import * as yup from 'yup';
import axios from 'axios';
import toast from 'react-hot-toast';
import {Link, useNavigate} from 'react-router-dom';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {apiError} from '../utils/apiError';
import {passwordCheck, profileCheck} from '../utils/signUpCheck';

const Profile = () => {
    const {user, saveUser, clearUser} = useAuth();
    const {t} = useLanguage();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [reload, setReload] = useState(0);
    const token = user?.token;
    const loadProfile = useCallback(async signal => {
        setLoading(true);
        setLoadError(false);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
                headers: {Authorization: `Bearer ${token}`}, signal,
            });
            if (!signal?.aborted) setProfile(response.data.data);
        } catch {
            if (!signal?.aborted) setLoadError(true);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        const controller = new AbortController();
        loadProfile(controller.signal);
        return () => controller.abort();
    }, [loadProfile, reload]);

    return (
        <div className="app-max-width px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">{t('profile.title')}</h1>
            {loading ? <p role="status">{t('common.loading')}</p> : loadError ? (
                <div role="alert"><p>{t('common.dataUnavailable')}</p>
                    <button onClick={() => setReload(value => value + 1)} className="underline">{t('common.retry')}</button>
                </div>
            ) : profile && (
                <div className="grid gap-6 md:grid-cols-2">
                    <section className="border rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">{t('profile.edit')}</h2>
                        <p className="mb-4 text-gray-600">{profile.username}</p>
                        <Formik enableReinitialize initialValues={Object.fromEntries(
                            ['firstName', 'lastName', 'email', 'phoneNumber'].map(field => [field, profile[field] || ''])
                        )} validationSchema={profileCheck(t)} onSubmit={async (values, {setStatus}) => {
                            setStatus('');
                            try {
                                const response = await axios.put(`${import.meta.env.VITE_API_URL}/users`, values,
                                    {headers: {Authorization: `Bearer ${token}`}});
                                setProfile(response.data.data);
                                saveUser({...user, ...values});
                                toast.success(t('profile.saved'));
                            } catch (error) {
                                setStatus(apiError(error, t('profile.saveError')));
                            }
                        }}>
                            {({isSubmitting, status}) => <Form className="space-y-4">
                                {['firstName', 'lastName', 'email', 'phoneNumber'].map(field => (
                                    <div key={field}>
                                        <label htmlFor={`profile-${field}`} className="block mb-1">{t(`auth.${field}`)}</label>
                                        <Field id={`profile-${field}`} name={field} type={field === 'email' ? 'email' : field === 'phoneNumber' ? 'tel' : 'text'} className="border rounded p-2 w-full" />
                                        <ErrorMessage name={field} component="p" className="text-sm text-red-700" />
                                    </div>
                                ))}
                                {status && <p role="alert" className="text-red-700">{status}</p>}
                                <button disabled={isSubmitting} type="submit" className="bg-gray-800 text-white px-4 py-2 rounded disabled:opacity-50">{t('common.save')}</button>
                            </Form>}
                        </Formik>
                    </section>
                    <section className="border rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-2">{t('profile.changePassword')}</h2>
                        <p className="text-sm text-gray-600 mb-4">{t('profile.passwordNotice')}</p>
                        <Formik initialValues={{currentPassword: '', newPassword: '', confirmPassword: ''}}
                            validationSchema={yup.object({
                                currentPassword: yup.string().required(t('validation.passwordRequired')),
                                newPassword: passwordCheck(t),
                                confirmPassword: yup.string().required(t('validation.passwordRequired'))
                                    .oneOf([yup.ref('newPassword')], t('validation.passwordMismatch')),
                            })} onSubmit={async ({currentPassword, newPassword}) => {
                                setPasswordError('');
                                try {
                                    await axios.put(`${import.meta.env.VITE_API_URL}/users/me/password`, {currentPassword, newPassword},
                                        {headers: {Authorization: `Bearer ${token}`}});
                                    clearUser();
                                    toast.success(t('profile.passwordChanged'));
                                    navigate('/login', {replace: true});
                                } catch (error) {
                                    setPasswordError(apiError(error, t('profile.saveError')));
                                }
                            }}>
                            {({isSubmitting}) => <Form className="space-y-4">
                                {['currentPassword', 'newPassword', 'confirmPassword'].map(field => (
                                    <div key={field}>
                                        <label htmlFor={field} className="block mb-1">{t(`profile.${field}`)}</label>
                                        <Field id={field} name={field} type="password" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} className="border rounded p-2 w-full" />
                                        <ErrorMessage name={field} component="p" className="text-sm text-red-700" />
                                    </div>
                                ))}
                                {passwordError && <p role="alert" className="text-red-700">{passwordError}</p>}
                                <button disabled={isSubmitting} type="submit" className="bg-gray-800 text-white px-4 py-2 rounded disabled:opacity-50">{t('profile.changePassword')}</button>
                            </Form>}
                        </Formik>
                    </section>
                </div>
            )}
            <Link to="/shop" className="inline-block mt-6 underline">{t('profile.shopNow')}</Link>
        </div>
    );
};

export default Profile;
