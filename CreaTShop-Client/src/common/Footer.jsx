import React from "react";
import { Link } from "react-router-dom";
import {useLanguage} from "../i18n/LanguageContext";

const Footer = () => {
  const {t} = useLanguage();

  return (
    <footer className="bg-black text-white py-10 w-full">
      <div className="container mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link
              to={"/"}
              className="text-2xl font-bold"
              style={{fontFamily: "cursive"}}
            >
              CreaT
            </Link>
            <br />
            <p className="mb-2 font-bold">{t('footer.contact')}</p>
            <p>{t('footer.location')}</p>
            <p>{t('footer.tel')}</p>
            <p className="mb-2">Email: support@creat.com</p>
            <p> <i>{t('footer.hours')}</i></p>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">{t('footer.about')}</h2>
            <ul>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  {t('footer.aboutUs')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  {t('footer.viewCart')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  {t('footer.wishlist')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  {t('footer.trackOrder')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">{t('footer.newsletter')}</h2>
            <p>
              {t('footer.newsletterText')}
            </p>
            <div className="mt-4">
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="border-2 border-gray-600 rounded-md py-2 px-4 w-full bg-gray-800 text-white placeholder-gray-400"
              />
              <button className="mt-2 bg-red-600 text-white py-2 px-4 rounded-md">
                {t('footer.subscribe')}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-700 pt-6 text-center">
          <p className="text-gray-400">
            © 2025 <i>Creat</i> by Nhom15
          </p>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
