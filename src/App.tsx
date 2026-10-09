/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CHEMICAL_PRODUCTS } from './data/products';
import { ChemicalProduct } from './types/chemical';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { EnquiryModal } from './components/EnquiryModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NeonDbModal } from './components/NeonDbModal';
import { DirectAdvantageSection } from './components/DirectAdvantageSection';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminPanel } from './components/admin/AdminPanel';
import { SlidersHorizontal, AlertCircle, MessageSquare } from 'lucide-react';

export default function App() {
  // Routing / View state: market vs admin
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
    }
    return false;
  });

  // Admin authentication state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aniixa_admin_token');
    }
    return null;
  });
  const [adminUser, setAdminUser] = useState<any>(null);

  // Market state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [selectedGrade, setSelectedGrade] = useState('Alle');
  
  // Modals state
  const [enquiryProduct, setEnquiryProduct] = useState<ChemicalProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<ChemicalProduct | null>(null);
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);

  // Database & Inquiry stats
  const [neonConnected, setNeonConnected] = useState(false);
  const [totalEnquiries, setTotalEnquiries] = useState(0);

  // Verify Admin Session if token exists
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Ungültiger Token');
        })
        .then((data) => {
          setAdminUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem('aniixa_admin_token');
          setAdminToken(null);
          setAdminUser(null);
        });
    }
  }, [adminToken]);

  // Synchronize hash/route with view state
  useEffect(() => {
    const handleLocationChange = () => {
      const isUrlAdmin = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
      setIsAdminMode(isUrlAdmin);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Check Neon DB status on mount
  const checkDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setNeonConnected(Boolean(data.connected));
        setTotalEnquiries(data.enquiryCount || 0);
      }
    } catch {
      setNeonConnected(false);
    }
  };

  useEffect(() => {
    checkDbStatus();
  }, []);

  // Dynamic chemical products state from Neon DB / API
  const [productsList, setProductsList] = useState<ChemicalProduct[]>(CHEMICAL_PRODUCTS);

  // Fetch catalog products from server
  const fetchProductsCatalog = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const defaultChemImg = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80';
          const sanitizedDbProducts = data.products.map((p: any) => ({
            ...p,
            thumbnail:
              (p.thumbnail && p.thumbnail.trim()) ||
              (p.primaryThumbnail && p.primaryThumbnail.trim()) ||
              (Array.isArray(p.thumbnails) && p.thumbnails.find((t: any) => typeof t === 'string' && t.trim())) ||
              defaultChemImg,
          }));
          // Merge custom database products with standard default catalog
          const dbIds = new Set(sanitizedDbProducts.map((p: any) => p.id));
          const nonDuplicatedDefaults = CHEMICAL_PRODUCTS.filter((p) => !dbIds.has(p.id));
          setProductsList([...sanitizedDbProducts, ...nonDuplicatedDefaults]);
        }
      }
    } catch (e) {
      console.warn('Could not fetch products catalog from server:', e);
    }
  };

  useEffect(() => {
    fetchProductsCatalog();
  }, []);

  // Filter products by search query, category, and grade
  const filteredProducts = useMemo(() => {
    return productsList.filter((prod) => {
      // Category filter
      if (selectedCategory !== 'Alle' && prod.category !== selectedCategory) {
        return false;
      }

      // Grade filter
      if (selectedGrade !== 'Alle' && prod.grade !== selectedGrade) {
        return false;
      }

      // Search query (matches name, CAS number, formula, or IUPAC name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = prod.name?.toLowerCase().includes(q);
        const matchesCas = prod.casNumber?.toLowerCase().includes(q);
        const matchesFormula = prod.formula?.toLowerCase().includes(q);
        const matchesIupac = prod.iupacName?.toLowerCase().includes(q);
        const matchesId = prod.id?.toLowerCase().includes(q);
        return matchesName || matchesCas || matchesFormula || matchesIupac || matchesId;
      }

      return true;
    });
  }, [productsList, searchQuery, selectedCategory, selectedGrade]);

  const grades = [
    'Alle',
    'ACS Reagent',
    'USP Grade',
    'AR Grade',
    'p.a. (pro analysi)',
    'Ph. Eur. / DAB',
    'Technical Grade',
    'Educational Grade',
    'Pure / Reinst',
  ];

  // Handle open admin
  const handleOpenAdmin = () => {
    setIsAdminMode(true);
    window.location.hash = '#admin';
  };

  // Handle return to market
  const handleReturnToMarket = () => {
    setIsAdminMode(false);
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // -------------------------------------------------------------
  // RENDER ADMIN MODE (Separate Admin Experience)
  // -------------------------------------------------------------
  if (isAdminMode) {
    if (!adminToken || !adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={(token, user) => {
            setAdminToken(token);
            setAdminUser(user);
          }}
          onReturnToMarket={handleReturnToMarket}
        />
      );
    }

    return (
      <AdminPanel
        token={adminToken}
        initialUser={adminUser}
        onLogout={() => {
          localStorage.removeItem('aniixa_admin_token');
          setAdminToken(null);
          setAdminUser(null);
        }}
        onReturnToMarket={handleReturnToMarket}
      />
    );
  }

  // -------------------------------------------------------------
  // RENDER PUBLIC MARKET MODE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Bar Header with Smooth Slidable Navigation */}
      <Header
        onOpenNeonModal={() => setIsNeonModalOpen(true)}
        neonConnected={neonConnected}
        totalEnquiries={totalEnquiries}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Hero Section with Search & Direct Principle */}
      <Hero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Main Catalog View */}
      <main id="katalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Catalog Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs uppercase font-mono text-slate-400">
              Verfügbare Chargen ({filteredProducts.length} Artikel)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Geprüfte Laborchemikalien & Reagenzien
            </h2>
          </div>

          {/* Grade Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Qualität:</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
              {grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedGrade === grade
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEnquire={(prod) => setEnquiryProduct(prod)}
                onViewDetails={(prod) => setDetailProduct(prod)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200 p-8">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-900 text-base">
              Keine Chemikalien für Ihre Suchkriterien gefunden
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Versuchen Sie es mit einem anderen Suchbegriff oder setzen Sie die Filter zurück. Sie können auch eine Sonderanfrage per WhatsApp stellen.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Alle');
                  setSelectedGrade('Alle');
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Filter zurücksetzen
              </button>
              <a
                href="https://wa.me/4915201234567?text=Guten%20Tag%2C%20ich%20suche%20eine%20spezifische%20Chemikalie%2C%20die%20nicht%20im%20Katalog%20gelistet%20ist."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Sonderanfrage per WhatsApp</span>
              </a>
            </div>
          </div>
        )}

      </main>

      {/* German Direct Market Principle Section (Why No B2B) */}
      <DirectAdvantageSection />

      {/* Footer */}
      <Footer
        onOpenNeonModal={() => setIsNeonModalOpen(true)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* 1. Core Feature: Enquiry Popup fetching product ID, thumbnail, name, price, collecting buyer info and launching WhatsApp */}
      <EnquiryModal
        isOpen={Boolean(enquiryProduct)}
        onClose={() => setEnquiryProduct(null)}
        product={enquiryProduct}
        whatsappNumber={import.meta.env.VITE_WHATSAPP_NUMBER || '4915201234567'}
        onEnquiryLogged={() => {
          setTotalEnquiries((prev) => prev + 1);
        }}
      />

      {/* 2. Detailed Technical Specifications Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEnquire={(prod) => {
          setDetailProduct(null);
          setEnquiryProduct(prod);
        }}
      />

      {/* 3. Neon PostgreSQL Status & Environment Variable Inspector */}
      <NeonDbModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
        neonConnected={neonConnected}
        onRefreshStatus={checkDbStatus}
      />
    </div>
  );
}
