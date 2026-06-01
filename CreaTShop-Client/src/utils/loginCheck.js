import * as yup from "yup";
export const loginCheck = (t = (key) => key) => 
  yup.object({
    username: yup.string().required(t('validation.usernameRequired')),
    password: yup.string().required(t('validation.passwordRequired')),
  });

