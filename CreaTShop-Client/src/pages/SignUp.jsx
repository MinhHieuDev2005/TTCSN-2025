import axios from 'axios';
import {ErrorMessage, Field, Formik, Form} from 'formik';
import toast from 'react-hot-toast';
import {Link, useNavigate} from 'react-router-dom';
import {useLanguage} from '../i18n/LanguageContext';
import {signUpCheck} from '../utils/signUpCheck';
import {apiError} from '../utils/apiError';

const SignUp = () => {
    const navigate = useNavigate();
    const {t} = useLanguage();
    const fields = ['firstName', 'lastName', 'username', 'password', 'email', 'phoneNumber', 'dateOfBirth'];
    return (
        <div className="flex justify-center px-4 py-8">
            <div className="w-full max-w-md border border-gray-300 p-6 sm:p-10 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-6 text-center">{t('auth.signupTitle')}</h1>
                <Formik initialValues={Object.fromEntries(fields.map(field => [field, '']))}
                    validationSchema={signUpCheck(t)} onSubmit={async (values, {setErrors}) => {
                        try {
                            await axios.post(`${import.meta.env.VITE_API_URL}/users`, {...values, dateOfBirth: values.dateOfBirth || null});
                            toast.success(t('auth.signupSuccess'));
                            navigate('/login');
                        } catch (error) {
                            const details = error.response?.data?.data;
                            if (details && typeof details === 'object') {
                                setErrors(Object.fromEntries(Object.entries(details).filter(([field, message]) =>
                                    Object.hasOwn(values, field) && typeof message === 'string')));
                            }
                            toast.error(apiError(error, t('auth.signupFailed')));
                        }
                    }}>
                    {({isSubmitting, errors, touched}) => <Form className="space-y-3">
                        {fields.map(field => (
                            <div key={field}>
                                <label htmlFor={`signup-${field}`} className="block text-sm mb-1">{t(`auth.${field}`)}</label>
                                <Field id={`signup-${field}`} name={field}
                                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : field === 'phoneNumber' ? 'tel' : field === 'dateOfBirth' ? 'date' : 'text'}
                                    autoComplete={field === 'password' ? 'new-password' : field === 'username' ? 'username' : undefined}
                                    aria-invalid={Boolean(touched[field] && errors[field])} aria-describedby={`signup-error-${field}`}
                                    className="w-full border border-gray-400 p-2 rounded-lg" />
                                <ErrorMessage id={`signup-error-${field}`} name={field} component="p" className="text-sm text-red-700 mt-1" />
                            </div>
                        ))}
                        <button disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded" type="submit">
                            {t('auth.signupButton')}
                        </button>
                        <p className="text-sm text-gray-500 text-center">{t('auth.haveAccount')}{' '}
                            <Link to="/login" className="text-blue-600 underline">{t('auth.loginButton')}</Link>
                        </p>
                    </Form>}
                </Formik>
            </div>
        </div>
    );
};

export default SignUp;
