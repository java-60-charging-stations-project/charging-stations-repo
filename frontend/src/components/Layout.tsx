import React from 'react';
import Navbar from '@/components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen relative" style={{ background: '#FAFAF7' }}>
      {/* Subtle warm gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(48,209,88,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(10,132,255,0.03) 0%, transparent 50%)' }}
      />

      <div className="relative z-10">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
