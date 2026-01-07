import React, {useEffect} from "react";
import "./Slider.scss";
import Swiper from "swiper";
import {Autoplay, Pagination} from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import slider1 from "../../assets/slider1.jpg"
import slider2 from "../../assets/slider2.jpg"
import slider3 from "../../assets/slider3.jpg"
import slider4 from "../../assets/slider4.jpg"
import slider5 from "../../assets/slider5.jpg"

Swiper.use([Autoplay, Pagination]);

const Slider = () => {
  const slides = [
    slider1,
    slider2,
    slider3,
    slider4,
    slider5,

  ];
  useEffect(() => {
    const swiper = new Swiper(".progress-slide-carousel", {
      loop: true,
      autoplay: {
        delay: 1200,
        disableOnInteraction: false,
      },
      pagination: {
        el: ".progress-slide-carousel .swiper-pagination",
        type: "progressbar",
      },
    });

    return () => {
      swiper.destroy();
    };
  }, []);

  return (
    <div className="w-full relative">
      <div className="swiper progress-slide-carousel swiper-container relative">
        <div className="swiper-wrapper">
          {slides.map((slide, index) => (
            <div key={index} className="swiper-slide">
              <div className="bg-indigo-50 rounded-2xl h-96 flex justify-center items-center">
                <img src={slide} className="w-full h-full object-fill rounded-2xl"/>
              </div>
            </div>
          ))}
        </div>
        <div className="swiper-pagination !bottom-2 !top-auto !w-80 right-0 mx-auto bg-gray-100">
        </div>
      </div>
    </div>
  );
};

export default Slider;
