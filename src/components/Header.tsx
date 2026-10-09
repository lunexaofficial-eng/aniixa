import React, { useRef, useState, useEffect } from 'react';
import { Database, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  onOpenNeonModal: () => void;
  neonConnected: boolean;
  totalEnquiries: number;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenAdmin: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  type: 'category' | 'section' | 'admin';
  target: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'Alle', label: 'Alle Chemikalien', type: 'category', target: 'Alle' },
  { id: 'Solvents', label: 'Lösungsmittel', type: 'category', target: 'Solvents' },
  { id: 'Acids & Bases', label: 'Säuren & Basen', type: 'category', target: 'Acids & Bases' },
  { id: 'Salts & Inorganic Compounds', label: 'Salze & Anorganik', type: 'category', target: 'Salts & Inorganic Compounds' },
  { id: 'Buffers', label: 'Puffer (Buffers)', type: 'category', target: 'Buffers' },
  { id: 'Indicators', label: 'Indikatoren', type: 'category', target: 'Indicators' },
  { id: 'Reagents', label: 'Reagenzien', type: 'category', target: 'Reagents' },
  { id: 'Laboratory Reagent', label: 'Laborreagenzien', type: 'category', target: 'Laboratory Reagent' },
  { id: 'Glassware', label: 'Labor-Glasware', type: 'category', target: 'Glassware' },
  { id: 'Organic Compounds', label: 'Organik', type: 'category', target: 'Organic Compounds' },
  { id: 'Analytical & Pure Reagents', label: 'Reinststoffe', type: 'category', target: 'Analytical & Pure Reagents' },
  { id: 'vorteile', label: 'Ohne B2B-Zwang', type: 'section', target: '#vorteile' },
  { id: 'standards', label: 'Qualitätsnormen', type: 'section', target: '#standards' },
  { id: 'admin', label: 'Admin-Portal', type: 'admin', target: '#admin' },
  { id: 'kontakt', label: 'Direktkontakt', type: 'section', target: '#kontakt' },
];

export const Header: React.FC<HeaderProps> = ({
  onOpenNeonModal,
  neonConnected,
  totalEnquiries,
  selectedCategory,
  onSelectCategory,
  onOpenAdmin,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<string>(selectedCategory);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Sync active item when category changes from outside
  useEffect(() => {
    setActiveItem(selectedCategory);
  }, [selectedCategory]);

  // Check scroll boundary to show subtle arrow hints if needed
  const updateScrollBounds = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollBounds();
    window.addEventListener('resize', updateScrollBounds);
    return () => window.removeEventListener('resize', updateScrollBounds);
  }, []);

  const slideHorizontal = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const step = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -step : step,
        behavior: 'smooth',
      });
      setTimeout(updateScrollBounds, 300);
    }
  };

  const handleItemClick = (item: MenuItem, element: HTMLElement) => {
    setActiveItem(item.id);

    // Smoothly center the clicked item in the horizontal bar
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elLeft = element.offsetLeft;
      const elWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = elLeft - (containerWidth / 2) + (elWidth / 2);

      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }

    if (item.type === 'admin') {
      onOpenAdmin();
      return;
    }

    if (item.type === 'category') {
      onSelectCategory(item.target);
      const catalogEl = document.getElementById('katalog');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const sectionEl = document.querySelector(item.target);
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Mouse drag support for smooth horizontal sliding
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
    updateScrollBounds();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Clean Brand Logo Wordmark */}
        <a href="#" className="flex items-center gap-2 group shrink-0 select-none pr-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center font-mono text-base shadow-xs group-hover:bg-emerald-700 transition-colors">
            A
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Aniixa
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </a>

        {/* Center: Horizontal Smooth Slidable Menu (NO 3-lines menu!) */}
        <div className="relative flex-1 min-w-0 flex items-center px-1 sm:px-2">
          
          {/* Subtle Left Slide Arrow (appears only when scrollable left) */}
          {canScrollLeft && (
            <button
              onClick={() => slideHorizontal('left')}
              className="absolute left-0 z-20 w-6 h-6 rounded-full bg-white/95 border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              aria-label="Nach links schieben"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Smooth Horizontal Slidable Track */}
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollBounds}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1 w-full select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {MENU_ITEMS.map((item) => {
              const isSelected = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e.currentTarget)}
                  className={`relative px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors shrink-0 font-medium cursor-pointer ${
                    isSelected
                      ? 'text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {/* Smooth sliding active background pill */}
                  {isSelected && (
                    <motion.div
                      layoutId="smoothActivePill"
                      className="absolute inset-0 bg-slate-900 rounded-full shadow-2xs -z-1"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Subtle Right Slide Arrow (appears only when scrollable right) */}
          {canScrollRight && (
            <button
              onClick={() => slideHorizontal('right')}
              className="absolute right-0 z-20 w-6 h-6 rounded-full bg-white/95 border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              aria-label="Nach rechts schieben"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Clean, unbloated actions (Neon Status + WhatsApp) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNeonModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            title="Neon PostgreSQL Status"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Neon:</span>
            <span className={neonConnected ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
              {neonConnected ? 'Aktiv' : 'Bereit'}
            </span>
            {totalEnquiries > 0 && (
              <span className="text-slate-400 font-normal">({totalEnquiries})</span>
            )}
          </button>

          <a
            href="https://wa.me/4915201234567?text=Guten%20Tag%20Aniixa%20Team%2C%20ich%20m%C3%B6chte%20eine%20Chemikalien-Anfrage%20stellen."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>

      </div>
    </header>
  );
};
