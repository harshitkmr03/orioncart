import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-12 bg-black text-gray-200">
      <div className="container mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl font-extrabold text-white">OrionCart</div>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Connecting customers with local shops nearby — fast delivery, secure payments and support for small
              businesses.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">For Customers</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>How it works</li>
              <li>Browse shops</li>
              <li>Delivery info</li>
              <li>Gift cards</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">For Restaurants</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>Partner with us</li>
              <li>Apps for you</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">For Delivery Partners</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>Sign up to deliver</li>
              <li>Partner resources</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Learn More</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Help & Support</li>
              <li>Blog</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-gray-400 text-sm">
            <div>© {new Date().getFullYear()} OrionCart™ Ltd. All rights reserved.</div>
            <div className="hidden sm:block">By continuing past this page, you agree to our Terms & Privacy Policy.</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-3">
              {/* simple social icons */}
              <a href="#" aria-label="LinkedIn" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.98 3.5C4.98 4.604 4.09 5.5 2.98 5.5 1.87 5.5 1 4.604 1 3.5 1 2.396 1.87 1.5 2.98 1.5 4.09 1.5 4.98 2.396 4.98 3.5Z" fill="#fff"/><path d="M3 8H7V23H3V8Z" fill="#fff"/><path d="M9 8H13V10.5C13.856 9.18 15.827 7.5 18.5 7.5C22.5 7.5 23 10.25 23 14.5V23H19V15.5C19 13.5 18.5 12 16.5 12 14.5 12 14 13.5 14 15.5V23H9V8Z" fill="#fff"/></svg></a>
              <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="#fff" strokeWidth="1.2"/></svg></a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 12C22 6.477 17.523 2 12 2S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.99H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.772-1.63 1.563V12h2.773l-.443 2.888h-2.33v6.99C18.343 21.128 22 16.991 22 12z" fill="#fff"/></svg></a>
            </div>

            <div className="flex items-center gap-3">
              {/* App badges – simple stylized links that resemble store badges */}
              <a href="#" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-gray-800 text-xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white" xmlns="http://www.w3.org/2000/svg"><path d="M16.365 1.43c.02.14.09.295.24.46.145.18.28.28.44.45.87.94 1.32 2.14 1.32 3.38 0 2.02-.83 4.1-2.33 5.38-.5.44-1.06.83-1.66 1.1-.8.37-1.6.5-2.37.5-.18 0-.35 0-.52-.02-.18-.02-.36-.05-.54-.08-.04-.01-.12-.02-.24-.04-.64-.11-1.28-.33-1.9-.66C6.9 14.12 5.2 12.1 5.2 8.69c0-2.4.86-4.48 2.44-6.01C8.61.61 10.4 0 12.53 0c1.82 0 3 .44 3.84 1.18.39.34.63.72.72 1.25z" fill="#fff" /></svg>
                <div>
                  <div className="text-xs text-gray-300">Download on the</div>
                  <div className="text-sm text-white font-semibold">App Store</div>
                </div>
              </a>

              <a href="#" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-gray-800 text-xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white" xmlns="http://www.w3.org/2000/svg"><path d="M2 6.5C2 4.57 3.57 3 5.5 3h13C20.43 3 22 4.57 22 6.5v11c0 1.93-1.57 3.5-3.5 3.5h-13C3.57 21 2 19.43 2 17.5v-11z" stroke="#fff" strokeWidth="0.8" /><path d="M7 15.5l3-3 3 3 5-5" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div>
                  <div className="text-xs text-gray-300">Get it on</div>
                  <div className="text-sm text-white font-semibold">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
