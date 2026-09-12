import React from 'react';

interface SaathiLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showSubtitle?: boolean;
  className?: string;
}

export const SaathiLogo: React.FC<SaathiLogoProps> = ({
  size = 'md',
  variant = 'auto',
  showSubtitle = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { height: 'h-7', text: 'text-lg', sub: 'text-[9px]' },
    md: { height: 'h-9', text: 'text-xl', sub: 'text-[10px]' },
    lg: { height: 'h-14', text: 'text-3xl', sub: 'text-xs' },
    xl: { height: 'h-20', text: 'text-5xl', sub: 'text-sm' },
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Script logo badge */}
      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden shadow-sm transition-transform ${
          selectedSize.height
        } aspect-[2.1/1] bg-black border border-slate-800 ring-1 ring-white/10`}
      >
        <img
          src="/logo.png"
          alt="SAATHI Logo"
          className="w-full h-full object-contain p-1 filter contrast-125"
          onError={(e) => {
            // Graceful fallback if image is loading
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight ${selectedSize.text} text-slate-900 dark:text-white`}>
            SAATHI
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        {showSubtitle && (
          <p className={`${selectedSize.sub} font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase`}>
            Adaptive Healthcare Companion
          </p>
        )}
      </div>
    </div>
  );
};
