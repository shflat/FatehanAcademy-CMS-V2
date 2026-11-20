import React, { useEffect, useRef, useState } from 'react';
import { resolveStaticImageUrl, VITE_IMAGES } from '../../data/mediaAssets';

interface ProgressiveImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  wrapperClassName?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const resolvedInitial = resolveStaticImageUrl(src);
  const [activeSrc, setActiveSrc] = useState(resolvedInitial);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextSrc = resolveStaticImageUrl(src);
    setActiveSrc(nextSrc);
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden bg-stone-200/70 dark:bg-slate-800/70 ${wrapperClassName}`}
    >
      {/* Subtle Shimmer Blur Placeholder until image settles */}
      {!loaded && !hasError && (
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
          alt={alt}
          loading={loading}
          decoding={decoding}
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
          className={`transition-all duration-700 ease-out will-change-[transform,opacity,filter] ${
            loaded
              ? 'opacity-100 blur-0 scale-100'
              : 'opacity-0 blur-md scale-[1.04]'
          } ${className}`}
          {...rest}
        />
      )}
    </div>
  );
};
