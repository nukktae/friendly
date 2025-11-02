import React, { useState } from 'react';
import { ImageStyle, Image as RNImage } from 'react-native';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  style?: ImageStyle;
  fallbackSrc?: string;
  onError?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  style,
  fallbackSrc = 'https://via.placeholder.com/300x300/e5e7eb/9ca3af?text=No+Image',
  onError,
  resizeMode = 'cover',
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      onError?.();
    }
  };

  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        loading="lazy"
        style={style as React.CSSProperties}
      />
    );
  }

  // For React Native (mobile)
  const defaultStyle: ImageStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <RNImage
      source={{ uri: imgSrc }}
      style={[defaultStyle, style]}
      onError={handleError}
      resizeMode={resizeMode}
      accessible={true}
      accessibilityLabel={alt}
    />
  );
};

export default ImageWithFallback;
