import React, { useEffect, useRef, useState } from 'react';
import {
  buildResponsiveSrcSet,
  resolveStaticImageUrl,
  VITE_IMAGES,
} from '../../data/mediaAssets';

interface ProgressiveImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  /** Mark above-the-fold LCP hero images as priority to paint immediately with fetchPriority="high". */
  priority?: boolean;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  priority = false,
  loading,
  decoding,
  sizes,
  srcSet,
  ...rest
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const resolvedInitial = resolveStaticImageUrl(src);
  const [activeSrc, setActiveSrc] = useState(resolvedInitial);
  const [loaded, setLoaded] = useState(priority);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextSrc = resolveStaticImageUrl(src);
    setActiveSrc(nextSrc);
    setHasError(false);
    if (priority) {
      setLoaded(true);
      return;
    }
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src, priority]);

  const computedSrcSet = srcSet ?? buildResponsiveSrcSet(activeSrc);
  const computedSizes =
    sizes ?? (computedSrcSet ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px' : undefined);

  return (
    <div
      className={`relative overflow-hidden bg-stone-200/70 dark:bg-slate-800/70 ${wrapperClassName}`}
    >
      {/* Subtle Shimmer Placeholder for non-LCP lazy images */}
      {!priority && !loaded && !hasError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 img-shimmer-placeholder pointer-events-none"
        />
      )}

      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-200">
          <span className="text-xs font-extrabold line-clamp-2">{alt}</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={activeSrc}
          srcSet={computedSrcSet}
          sizes={computedSizes}
          alt={alt}
          loading={loading ?? (priority ? 'eager' : 'lazy')}
          decoding={decoding ?? (priority ? 'sync' : 'async')}
          fetchPriority={priority ? 'high' : undefined}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (activeSrc !== VITE_IMAGES.fullstackPkg) {
              setActiveSrc(VITE_IMAGES.fullstackPkg);
            } else {
              setHasError(true);
              setLoaded(true);
            }
          }}
          className={
            priority
              ? `opacity-100 ${className}`
              : `transition-opacity duration-300 ease-out ${
                  loaded ? 'opacity-100' : 'opacity-0'
                } ${className}`
          }
          {...rest}
        />
      )}
    </div>
  );
};
