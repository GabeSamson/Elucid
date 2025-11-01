"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Desktop Sidebar - EXACTLY as original, only hidden on mobile */}
      <aside className="max-md:hidden w-64 bg-charcoal-dark text-cream-light p-6">
        <div className="mb-8">
          <Link href="/">
            <h1 className="font-serif text-2xl cursor-pointer hover:text-cream transition-colors">Elucid Admin</h1>
          </Link>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/homepage"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Homepage
          </Link>
          <Link
            href="/admin/products"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Products
          </Link>
          <Link
            href="/admin/inventory"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Inventory
          </Link>
          <Link
            href="/admin/collections"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Collections
          </Link>
          <Link
            href="/admin/orders"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Orders
          </Link>
          <Link
            href="/admin/in-person"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            In-Person Sales
          </Link>
          <Link
            href="/admin/analytics"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Analytics
          </Link>
          <Link
            href="/admin/promocodes"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Promo Codes
          </Link>
          <Link
            href="/admin/workspace"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Workspace
          </Link>
          <Link
            href="/admin/team"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Team
          </Link>
          <Link
            href="/admin/users"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Users
          </Link>
          <Link
            href="/admin/newsletter"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Newsletter
          </Link>
          <Link
            href="/admin/reviews"
            className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
          >
            Reviews
          </Link>

          <div className="pt-6 border-t border-cream-light/20 mt-6">
            <Link
              href="/"
              className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
            >
              Back to Site
            </Link>
          </div>
        </nav>
      </aside>

      {/* Mobile Header - ONLY on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-charcoal-dark text-cream-light p-4 z-40 flex items-center justify-between">
        <Link href="/">
          <h1 className="font-serif text-xl cursor-pointer hover:text-cream transition-colors">Elucid Admin</h1>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay - ONLY on mobile */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-charcoal-dark/80 backdrop-blur-sm z-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-charcoal-dark text-cream-light p-6 z-50 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <h1 className="font-serif text-2xl cursor-pointer hover:text-cream transition-colors">Elucid Admin</h1>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/homepage"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Homepage
              </Link>
              <Link
                href="/admin/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Products
              </Link>
              <Link
                href="/admin/inventory"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Inventory
              </Link>
              <Link
                href="/admin/collections"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Collections
              </Link>
              <Link
                href="/admin/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Orders
              </Link>
              <Link
                href="/admin/in-person"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                In-Person Sales
              </Link>
              <Link
                href="/admin/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Analytics
              </Link>
              <Link
                href="/admin/promocodes"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Promo Codes
              </Link>
              <Link
                href="/admin/workspace"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Workspace
              </Link>
              <Link
                href="/admin/team"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Team
              </Link>
              <Link
                href="/admin/users"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Users
              </Link>
              <Link
                href="/admin/newsletter"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Newsletter
              </Link>
              <Link
                href="/admin/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
              >
                Reviews
              </Link>

              <div className="pt-6 border-t border-cream-light/20 mt-6">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-5 py-3 hover:bg-charcoal transition-colors rounded-lg text-sm uppercase tracking-wider"
                >
                  Back to Site
                </Link>
              </div>
            </nav>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 max-md:pt-20 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
