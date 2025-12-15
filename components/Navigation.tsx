"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import AuthModal from "./AuthModal";
import CartModal from "./CartModal";
import SearchBar from "./SearchBar";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";

interface NavigationProps {
  locked?: boolean;
  isAdmin?: boolean;
}

export default function Navigation({ locked = false, isAdmin = false }: NavigationProps) {
  const { data: session, status } = useSession();
  const { totalItems, openCart } = useCart();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [navVariant, setNavVariant] = useState<'dark' | 'light'>(() => (pathname === "/" ? "dark" : "light"));

  useEffect(() => {
    const navEl = navRef.current;

    if (pathname !== "/") {
      setNavVariant("light");
      return;
    }

    const heroEl = document.querySelector<HTMLElement>('[data-nav-tone="dark"]');

    if (!heroEl) {
      setNavVariant("light");
      return;
    }

    const evaluateVariant = () => {
      const navHeight = navEl?.getBoundingClientRect().height ?? 0;
      const heroRect = heroEl.getBoundingClientRect();
      setNavVariant(heroRect.bottom > navHeight ? "dark" : "light");
    };

    evaluateVariant();

    const handleResize = () => evaluateVariant();

    window.addEventListener("scroll", evaluateVariant, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", evaluateVariant);
      window.removeEventListener("resize", handleResize);
    };
  }, [pathname]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth >= window.innerHeight);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
  };

  const isDarkSurface = navVariant === "dark";
  const navSurfaceClasses = isDarkSurface
    ? "bg-charcoal-dark/90 border-charcoal/60 shadow-lg"
    : "bg-cream/95 border-charcoal/10 shadow-sm";
  const brandLinkClasses = `text-sm font-light tracking-wider uppercase transition-colors duration-300 ${
    isDarkSurface ? "text-cream-light hover:text-cream" : "text-charcoal-dark hover:text-charcoal"
  }`;
  const navLinkClasses = `transition-colors text-sm uppercase tracking-wider ${
    isDarkSurface ? "text-cream-light/80 hover:text-cream-light" : "text-charcoal/80 hover:text-charcoal-dark"
  }`;
  const mobileBrandClasses = `text-xs font-light tracking-wide uppercase transition-colors duration-300 ${
    isDarkSurface ? "text-cream-light hover:text-cream" : "text-charcoal-dark hover:text-charcoal"
  }`;
  const mobileActionClasses = `transition-colors text-xs uppercase tracking-wide ${
    isDarkSurface ? "text-cream-light/80 hover:text-cream-light" : "text-charcoal/80 hover:text-charcoal-dark"
  }`;
  const mobileMenuButtonClasses = `p-2 transition-colors ${
    isDarkSurface ? "text-cream-light" : "text-charcoal-dark"
  }`;
  const showFullNav = !locked || isAdmin;

  return (
    <>
      <motion.nav
        ref={navRef}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1.4rem)',
          paddingBottom: '1.4rem',
        }}
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-6 md:py-6 transition-colors duration-300 border-b ${
          mobileMenuOpen && !isLandscape ? "" : "backdrop-blur-sm"
        } ${navSurfaceClasses}`}
      >
        {/* Desktop Navigation */}
        <div className={`${isLandscape ? 'flex' : 'hidden'} max-w-7xl mx-auto items-center w-full gap-6`}>
          <Link href="/" className={brandLinkClasses}>
            Elucid LDN
          </Link>

          {showFullNav && (
            <div className="flex items-center gap-8">
              <Link href="/shop" className={navLinkClasses}>
                Shop
              </Link>
              <Link href="/collections" className={navLinkClasses}>
                Collections
              </Link>
              <Link href="/about" className={navLinkClasses}>
                About
              </Link>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-6">
            {/* Search Icon */}
            {showFullNav && (
              <button
                onClick={() => setSearchOpen(true)}
                className={navLinkClasses}
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            {status === "authenticated" && session?.user ? (
              <div className="flex items-center gap-4">
                <Link href="/account" className={navLinkClasses}>
                  {session.user.name || "Account"}
                </Link>
                <button onClick={handleSignOut} className={navLinkClasses}>
                  Sign Out
                </button>
                {isAdmin && (
                  <Link href="/admin" className={navLinkClasses}>
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <button onClick={() => openAuthModal('signin')} className={navLinkClasses}>
                Sign In
              </button>
            )}
            {showFullNav && (
              <button onClick={openCart} className={navLinkClasses}>
                Cart ({totalItems})
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`${isLandscape ? 'hidden' : 'flex'} w-full items-center justify-between`}>
          <Link href="/" className={mobileBrandClasses}>
            Elucid LDN
          </Link>

          <div className="flex items-center gap-4">
            {showFullNav && (
              <button
                onClick={() => setSearchOpen(true)}
                className={mobileMenuButtonClasses}
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            {showFullNav && (
              <button onClick={openCart} className={mobileActionClasses}>
                Cart ({totalItems})
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={mobileMenuButtonClasses}
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <>
            <div
              className={`${isLandscape ? 'hidden' : 'fixed'} inset-0 bg-charcoal-dark/80 backdrop-blur-sm z-50`}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={`${isLandscape ? 'hidden' : 'fixed'} top-0 right-0 bottom-0 w-64 bg-cream-light z-50 shadow-2xl`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-charcoal/10">
                  <span className="text-sm font-light tracking-wider uppercase text-charcoal-dark">
                    Menu
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-charcoal-dark"
                    aria-label="Close menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <nav className="flex-1 p-6 space-y-4">
                  {/* Mobile Search */}
                  <div className="pb-4 border-b border-charcoal/10">
                    {showFullNav && <SearchBar variant="light" onClose={() => setMobileMenuOpen(false)} />}
                  </div>

                  {showFullNav && (
                    <>
                      <Link
                        href="/shop"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                      >
                        Shop
                      </Link>
                      <Link
                        href="/collections"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                      >
                        Collections
                      </Link>
                      <Link
                        href="/about"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                      >
                        About
                      </Link>
                      <Link
                        href="/gallery"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                      >
                        Gallery
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                    >
                      Admin
                    </Link>
                  )}

                  <div className="pt-6 border-t border-charcoal/10 space-y-4">
                    {status === "authenticated" && session?.user ? (
                      <>
                        <Link
                          href="/account"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                        >
                          Account
                        </Link>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleSignOut();
                          }}
                          className="block w-full text-left text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openAuthModal('signin');
                        }}
                        className="block w-full text-left text-base uppercase tracking-wider text-charcoal-dark hover:text-charcoal transition-colors py-2"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </motion.nav>

      {/* Search Modal */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 bg-charcoal-dark/80 backdrop-blur-sm z-50"
            onClick={() => setSearchOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50"
          >
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light tracking-wider uppercase text-charcoal-dark">
                  Search Products
                </h3>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-2 text-charcoal-dark hover:text-charcoal transition-colors"
                  aria-label="Close search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SearchBar variant="light" onClose={() => setSearchOpen(false)} />
            </div>
          </motion.div>
        </>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Cart Modal */}
      <CartModal />
    </>
  );
}
