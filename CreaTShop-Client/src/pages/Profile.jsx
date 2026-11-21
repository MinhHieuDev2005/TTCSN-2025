import {useCallback, useEffect, useRef, useState} from 'react';
import {ErrorMessage, Field, Form, Formik} from 'formik';
import * as yup from 'yup';
import axios from 'axios';
import toast from 'react-hot-toast';
import {Link, useNavigate} from 'react-router-dom';
import {FiEdit2, FiLock, FiUser} from 'react-icons/fi';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {apiError} from '../utils/apiError';
import {passwordCheck, profileCheck} from '../utils/signUpCheck';
import SocialAccounts from '../components/SocialAccounts';

const personalFields = ['lastName', 'firstName', 'phoneNumber'];
const inputClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 focus:border-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-800';
const buttonClass = 'rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50';

const Profile = () => {
    const {user, saveUser, clearUser} = useAuth();
    const {t} = useLanguage();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [editing, setEditing] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [reload, setReload] = useState(0);
    const editButton = useRef(null);
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
    useEffect(() => {
        if (editing) document.getElementById('profile-lastName')?.focus();
    }, [editing]);

    const finishEditing = () => {
        setEditing(false);
        requestAnimationFrame(() => editButton.current?.focus());
    };

    return (
        <div className="app-max-width px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="mb-6 text-3xl font-bold">{t('profile.title')}</h1>
                {loading ? <p role="status">{t('common.loading')}</p> : loadError ? (
                    <div role="alert"><p>{t('common.dataUnavailable')}</p>
                        <button onClick={() => setReload(value => value + 1)} className="underline">{t('common.retry')}</button>
                    </div>
                ) : profile && (
                    <>
                        <section aria-labelledby="profile-personal-title" className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <h2 id="profile-personal-title" className="flex items-center gap-2 text-lg font-semibold sm:text-xl"><FiUser aria-hidden="true" className="shrink-0" />{t('profile.personal')}</h2>
                                <button ref={editButton} type="button" onClick={() => setEditing(true)} aria-expanded={editing} aria-controls="profile-personal-content" className={`${editing ? 'hidden' : 'inline-flex'} shrink-0 items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50`}>
                                    <FiEdit2 aria-hidden="true" />{t('profile.editAction')}
                                </button>
                            </div>
                            <div id="profile-personal-content">
                                {editing ? <Formik initialValues={Object.fromEntries(personalFields.map(field => [field, profile[field] || '']))}
                                    validationSchema={profileCheck(t)} onSubmit={async (values, {setStatus}) => {
                                        setStatus('');
                                        try {
                                            const response = await axios.put(`${import.meta.env.VITE_API_URL}/users`, values,
                                                {headers: {Authorization: `Bearer ${token}`}});
                                            const saved = response.data.data;
                                            setProfile(saved);
                                            saveUser({...user, firstName: saved.firstName, lastName: saved.lastName, phoneNumber: saved.phoneNumber});
                                            finishEditing();
                                            toast.success(t('profile.saved'));
                                        } catch (error) {
                                            setStatus(apiError(error, t('profile.saveError')));
                                        }
                                    }}>
                                    {({isSubmitting, status, dirty}) => <Form className="space-y-5">
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            {personalFields.map(field => <div key={field}>
                                                <label htmlFor={`profile-${field}`} className="mb-1.5 block text-sm font-medium">{t(`auth.${field}`)}</label>
                                                <Field id={`profile-${field}`} name={field} type={field === 'phoneNumber' ? 'tel' : 'text'} autoComplete={field === 'phoneNumber' ? 'tel' : field === 'firstName' ? 'given-name' : 'family-name'} maxLength={field === 'phoneNumber' ? 15 : 255} className={inputClass} aria-describedby={`profile-${field}-error`} />
                                                <ErrorMessage id={`profile-${field}-error`} name={field} component="p" className="mt-1 text-sm text-red-700" />
                                            </div>)}
                                        </div>
                                        {status && <p role="alert" className="text-sm text-red-700">{status}</p>}
                                        <div className="flex flex-wrap gap-3">
                                            <button disabled={isSubmitting || !dirty} type="submit" className={buttonClass}>{t('profile.saveChanges')}</button>
                                            <button disabled={isSubmitting} type="button" onClick={finishEditing} className="rounded-md border border-gray-300 px-4 py-2.5 text-sm disabled:opacity-50">{t('common.cancel')}</button>
                                        </div>
                                    </Form>}
                                </Formik> : <dl className="grid gap-5 sm:grid-cols-2">
                                    {personalFields.map(field => <div key={field}>
                                        <dt className="mb-1 text-sm text-gray-500">{t(`auth.${field}`)}</dt>
                                        <dd className="break-words font-medium">{profile[field] || t('profile.notProvided')}</dd>
                                    </div>)}
                                </dl>}
                            </div>
                        </section>

                        <section aria-labelledby="profile-security-title" className="mt-6 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
                            <h2 id="profile-security-title" className="mb-5 flex items-center gap-2 text-lg font-semibold sm:text-xl"><FiLock aria-hidden="true" className="shrink-0" />{t('profile.security')}</h2>
                            <dl className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <dt className="mb-1 text-sm text-gray-500">{t('auth.email')}</dt>
                                    <dd className="break-all font-medium">{profile.email || t('profile.notProvided')}</dd>
                                    <dd className="mt-1.5 text-sm leading-relaxed text-gray-500">{t('profile.emailLocked')}</dd>
                                </div>
                                {profile.passwordConfigured === true && <div>
                                    <dt className="mb-1 text-sm text-gray-500">{t('auth.username')}</dt>
                                    <dd className="break-all font-medium">{profile.username}</dd>
                                </div>}
                            </dl>
                            <div className="mt-6 border-t border-gray-100 pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-medium">{t('auth.password')}</h3>
                                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">{t(profile.passwordConfigured === false ? 'profile.socialPassword' : profile.passwordConfigured === true ? 'profile.passwordSet' : 'profile.legacyPassword')}</p>
                                    </div>
                                    {profile.passwordConfigured !== false && <button type="button" disabled={changingPassword} aria-expanded={passwordOpen} aria-controls="profile-password-form" onClick={() => {setPasswordOpen(value => !value); setPasswordError('');}} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                                        {t(passwordOpen ? 'common.cancel' : 'profile.changePassword')}
                                    </button>}
                                </div>
                                {profile.passwordConfigured !== false && passwordOpen && <div id="profile-password-form" className="mt-5 max-w-xl">
                                    <p className="mb-4 text-sm text-gray-600">{t('profile.passwordNotice')}</p>
                                    <Formik initialValues={{currentPassword: '', newPassword: '', confirmPassword: ''}}
                                        validationSchema={yup.object({currentPassword: yup.string().required(t('validation.passwordRequired')), newPassword: passwordCheck(t), confirmPassword: yup.string().required(t('validation.passwordRequired')).oneOf([yup.ref('newPassword')], t('validation.passwordMismatch'))})}
                                        onSubmit={async ({currentPassword, newPassword}) => {
                                            setPasswordError('');
                                            setChangingPassword(true);
                                            try {
                                                await axios.put(`${import.meta.env.VITE_API_URL}/users/me/password`, {currentPassword, newPassword}, {headers: {Authorization: `Bearer ${token}`}});
                                                clearUser();
                                                toast.success(t('profile.passwordChanged'));
                                                navigate('/login', {replace: true});
                                            } catch (error) {
                                                setPasswordError(apiError(error, t('profile.saveError')));
                                            } finally {
                                                setChangingPassword(false);
                                            }
                                        }}>
                                        {({isSubmitting}) => <Form className="space-y-4">
                                            <fieldset disabled={isSubmitting} className="space-y-4">
                                                {['currentPassword', 'newPassword', 'confirmPassword'].map(field => <div key={field}>
                                                    <label htmlFor={field} className="mb-1.5 block text-sm font-medium">{t(`profile.${field}`)}</label>
                                                    <Field id={field} name={field} type="password" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} className={inputClass} aria-describedby={`${field}-error`} />
                                                    <ErrorMessage id={`${field}-error`} name={field} component="p" className="mt-1 text-sm text-red-700" />
                                                </div>)}
                                            </fieldset>
                                            {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
                                            <button disabled={isSubmitting} type="submit" className={buttonClass}>{t('profile.changePassword')}</button>
                                        </Form>}
                                    </Formik>
                                </div>}
                            </div>
                        </section>
                        <SocialAccounts />
                    </>
                )}
                <Link to="/shop" className="mt-6 inline-block text-sm underline underline-offset-4">{t('profile.shopNow')}</Link>
            </div>
        </div>
    );
};

export default Profile;
