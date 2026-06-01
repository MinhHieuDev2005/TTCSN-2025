import React from 'react'
import {useLanguage} from '../i18n/LanguageContext'

const Updating = () => {
  const {t} = useLanguage()
  return (
    <div>{t('updating.title')}</div>
  )
}

export default Updating
