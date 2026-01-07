import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
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
            <p className="mb-2 font-bold">Contact:</p>
            <p>Location: Bac Tu Liem, Ha Noi</p>
            <p>Tel: (+84) 123457890</p>
            <p className="mb-2">Email: support@creat.com</p>
            <p> <i>10:00 – 18:00 / Mon – Sat</i></p>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">ABOUT</h2>
            <ul>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  View Cart
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  My Wishlist
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white hover:underline hover: transition-all">
                  Track My Order
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">NEWSLETTER</h2>
            <p>
              Sign up to our newsletter and we'll keep you up-to-date with the
              latest news and special offers.
            </p>
            <div className="mt-4">
              <input
                type="email"
                placeholder="YOUR EMAIL"
                className="border-2 border-gray-600 rounded-md py-2 px-4 w-full bg-gray-800 text-white placeholder-gray-400"
              />
              <button className="mt-2 bg-red-600 text-white py-2 px-4 rounded-md">
                Subscribe
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
