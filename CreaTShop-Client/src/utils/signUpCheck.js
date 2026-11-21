import * as yup from 'yup';

export const passwordCheck = t => yup.string().required(t('validation.passwordRequired'))
    .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=<>?/{}~|-]).{8,16}$/, t('validation.passwordFormat'));

export const profileCheck = t => yup.object({
    firstName: yup.string().trim().required(t('validation.required')).max(255, t('validation.tooLong')),
    lastName: yup.string().trim().required(t('validation.required')).max(255, t('validation.tooLong')),
    phoneNumber: yup.string().required(t('validation.required')).matches(/^0\d{9,14}$/, t('validation.phone')),
});

export const signUpCheck = t => profileCheck(t).shape({
    email: yup.string().trim().required(t('validation.required')).email(t('validation.email')).max(255, t('validation.tooLong')),
    username: yup.string().trim().required(t('validation.usernameRequired')).max(255, t('validation.tooLong')),
    password: passwordCheck(t),
    dateOfBirth: yup.date().nullable().transform((value, original) => original === '' ? null : value)
        .max(new Date(), t('validation.birthDate')),
});
