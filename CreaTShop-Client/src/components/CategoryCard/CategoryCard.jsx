import React from 'react';
import menImg from '../../assets/men.jpg';
import womenImg from '../../assets/women.jpg';
import boyImg from '../../assets/boy.jpg';
import girlImg from '../../assets/girl.jpg';
import {useLanguage} from '../../i18n/LanguageContext';

const CategoryCard = () => {
  const {t} = useLanguage();
  const categories = [
    { name: t('category.men'), image: `${menImg}` },
    { name: t('category.women'), image: `${womenImg}` },
    { name: t('category.boy'), image: `${boyImg}` },
    { name: t('category.girl'), image: `${girlImg}` },
  ];

  return (
    <div className="bg-gray-50 py-8 flex justify-center">
      <div className="grid grid-cols-2 gap-6 w-[90%] md:w-[700px]">
        {categories.map((category, index) => (
          <div
            key={index}
            className="relative group h-48 overflow-hidden rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            {/** Background Image */}
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
            />
            {/** Text Overlay */}
            <div className="absolute bottom-4 left-4 text-white font-bold text-lg md:text-xl drop-shadow-lg">
              {category.name}
            </div>
            {/** Glass Effect */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryCard;
