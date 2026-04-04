import React, { useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { scrollToElement } from '../lib/smoothScroll';

const DirectOrderBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -left-4 w-24 h-24 border-2 border-white rounded-full" />
        <div className="absolute -bottom-4 -right-4 w-32 h-32 border-2 border-white rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
            <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 animate-pulse" />
            <p className="text-sm sm:text-base font-semibold text-center">
              Order direct &amp; save <span className="text-yellow-300 text-lg font-bold">10%</span> — 
              <span className="hidden sm:inline"> Skip Swiggy/Zomato fees!</span>
              <span className="sm:hidden"> Skip delivery apps!</span>
            </p>
            <button
              onClick={() => scrollToElement('#menu-tabs')}
              className="inline-flex items-center gap-1 bg-white text-emerald-700 font-bold text-sm px-4 py-1.5 rounded-full hover:bg-yellow-300 hover:text-emerald-800 transition-all duration-200 shrink-0"
            >
              Order Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white transition shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-emerald-100 mt-1">
          Use code <span className="font-bold text-yellow-300">DIRECT10</span> or it's auto-applied at checkout!
        </p>
      </div>
    </div>
  );
};

export default DirectOrderBanner;
