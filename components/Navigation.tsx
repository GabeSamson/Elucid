"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import AuthModal from "./AuthModal";
import CartModal from "./CartModal";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";

export default function Navigation() {
  const { data: session, status } = useSession();
  const { totalItems, openCart } = useCart();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLandscape, setIsLandscape] = useState(true);
  const [navVariant, setNavVariant] = useState<'dark' | 'light'>(() => (pathname === "/" ? "dark" : "light"));

  useEffect(() => {
    if (pathname !== "/") {
      setNavVariant("light");
      return;
    }

    const updateVariant = () => {
      const threshold = Math.max(window.innerHeight / 3, 160);
      setNavVariant(window.scrollY < threshold ? "dark" : "light");
    };

    updateVariant();
    window.addEventListener("scroll", updateVariant);
    return () => window.removeEventListener("scroll", updateVariant);
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

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}
        className={`fixed top-0 left-0 right-0 z-50 px-4 pb-3 md:px-6 md:py-6 transition-colors duration-300 border-b backdrop-blur-sm ${navSurfaceClasses}`}
      >
        {/* Desktop Navigation */}
        <div className={`${isLandscape ? 'grid' : 'hidden'} grid-cols-3 max-w-7xl mx-auto items-center w-full gap-4`}>
          <Link href="/" className={brandLinkClasses}>
            Elucid LDN
          </Link>

          <div className="flex items-center justify-center gap-12">
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

          <div className="flex items-center justify-end gap-6">
            {status === "authenticated" && session?.user ? (
              <div className="flex items-center gap-4">
                <Link href="/account" className={navLinkClasses}>
                  {session.user.name || "Account"}
                </Link>
                <button onClick={handleSignOut} className={navLinkClasses}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={() => openAuthModal('signin')} className={navLinkClasses}>
                Sign In
              </button>
            )}
            <button onClick={openCart} className={navLinkClasses}>
              Cart ({totalItems})
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`${isLandscape ? 'hidden' : 'flex'} w-full items-center justify-between`}>
          <Link href="/" className={mobileBrandClasses}>
            Elucid LDN
          </Link>

          <div className="flex items-center gap-4">
            <button onClick={openCart} className={mobileActionClasses}>
              Cart ({totalItems})
            </button>
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
