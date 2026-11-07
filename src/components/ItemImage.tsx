import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

// Global cache to track successfully loaded images across components for instant rendering
const globalLoadedCache = new Set<string>();
const globalFailedCache = new Set<string>();

interface ItemImageProps {
  name: string;
  itemId?: string;
  image?: string;
  images?: string[];
  rarity?: string;
  category?: string;
  className?: string;
}

export const ItemImage: React.FC<ItemImageProps> = ({
  name,
  itemId,
  image = '',
  images = [],
  rarity = 'Common',
  className = 'w-full h-full object-contain',
}) => {
  // Derive item ID
  const derivedId = React.useMemo(() => {
    if (itemId) return String(itemId);
    if (!image) return null;
    const match =
      image.match(/\/item-image\/(\d+)/i) ||
      image.match(/\/images\/(\d+)\.webp/i) ||
      image.match(/(\d+)/);
    return match ? match[1] : null;
  }, [itemId, image]);

  // Construct priority candidate URLs, filtering out any known failed URLs
  const candidateUrls: string[] = React.useMemo(() => {
    const list: string[] = [];
    const add = (url: string | undefined | null) => {
      if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (trimmed.length > 0 && !list.includes(trimmed) && !globalFailedCache.has(trimmed)) {
          list.push(trimmed);
        }
      }
    };

    // 1. Direct local static asset from public/dist images (Fastest: 0ms, zero server overhead)
    if (derivedId) {
      add(`/images/${derivedId}.webp`);
    }

    // 2. Direct Express server endpoint
    if (derivedId) {
      add(`/api/bloxfruits/item-image/${derivedId}`);
    }

    // 3. The provided image prop
    add(image);

    // 4. Any URLs in images array
    if (Array.isArray(images)) {
      for (const img of images) {
        add(img);
      }
    }

    // 5. Remote fallback via image-proxy
    if (derivedId) {
      const remoteSource = `https://bloxfruitsvalues.com/api/bloxfruits/item-image/${derivedId}`;
      add(`/api/image-proxy?url=${encodeURIComponent(remoteSource)}`);
      add(remoteSource);
    }

    return list;
  }, [derivedId, image, images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSrc = candidateUrls[currentIndex] || '';

  // Check if image is already cached in memory
  const isAlreadyCached = currentSrc ? globalLoadedCache.has(currentSrc) : false;
  const [isLoading, setIsLoading] = useState(!isAlreadyCached);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // If image was already loaded previously in the app session, display immediately
  useEffect(() => {
    if (currentSrc && globalLoadedCache.has(currentSrc)) {
      setIsLoading(false);
    }
    // Also check if the DOM image is already complete
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      if (currentSrc) globalLoadedCache.add(currentSrc);
      setIsLoading(false);
    }
  }, [currentSrc]);

  const handleError = () => {
    if (currentSrc) globalFailedCache.add(currentSrc);
    if (currentIndex + 1 < candidateUrls.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    if (currentSrc) globalLoadedCache.add(currentSrc);
    setIsLoading(false);
  };

  // Rarity styling for fallback badge
  const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
    Mythical: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-200' },
    Legendary: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200' },
    Rare: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200' },
    Uncommon: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200' },
    Common: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200' },
    Gamepass: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200' },
    Limited: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-200' },
  };

  const color = rarityColors[rarity] || rarityColors.Common;

  if (hasError || !currentSrc) {
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border ${color.border} ${color.bg} p-2 select-none w-full h-full`}
        title={name}
      >
        <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${color.text} mb-1 opacity-75`} />
        <span className={`font-mono font-black text-xs ${color.text}`}>{initials}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {isLoading && !isAlreadyCached && (
        <div className="absolute inset-0 bg-slate-100/40 rounded-lg animate-pulse" />
      )}
      <img
        ref={imgRef}
        key={currentSrc}
        src={currentSrc}
        alt={name}
        className={`${className} select-none`}
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
