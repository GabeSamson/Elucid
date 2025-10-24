'use client';

import { useSession } from 'next-auth/react';

export default function Footer() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <footer className="bg-charcoal-dark text-cream py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <h3 className="font-serif text-3xl mb-4">ELUCID</h3>
            <p className="text-cream/60 text-sm">
              Modern streetwear. Est. London.
            </p>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider mb-4">Navigate</h4>
            <ul className="space-y-2 text-cream/60 text-sm">
              <li><a href="/" className="hover:text-cream transition-colors">Home</a></li>
              <li><a href="/shop" className="hover:text-cream transition-colors">Shop</a></li>
              <li><a href="/collections" className="hover:text-cream transition-colors">Collections</a></li>
              <li><a href="/about" className="hover:text-cream transition-colors">About</a></li>
              {status === 'loading' ? null : isAdmin && (
                <li><a href="/admin" className="hover:text-cream transition-colors">Admin</a></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider mb-4">Follow</h4>
            <ul className="space-y-2 text-cream/60 text-sm">
              <li><a href="https://www.instagram.com/elucid.ldn?igsh=cW5id2NraDQ5Y2Ri&utm_source=qr" target="_blank" rel="noopener noreferrer" className="hover:text-cream transition-colors">Instagram</a></li>
              <li><a href="https://www.tiktok.com/@elucid.ldn6?_t=ZN-90liqr57uBK&_r=1" target="_blank" rel="noopener noreferrer" className="hover:text-cream transition-colors">TikTok</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2 text-cream/60 text-sm">
              <li><a href="mailto:Elucid.Ldn@gmail.com" className="hover:text-cream transition-colors">Elucid.Ldn@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-cream/10 text-center text-cream/40 text-sm">
          <p>&copy; 2025 Elucid LDN. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
