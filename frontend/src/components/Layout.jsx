import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Layout component wraps all pages with a consistent header (Navbar),
 * main content area, and footer. Handles responsive container sizing.
 */
export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Navbar />

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
