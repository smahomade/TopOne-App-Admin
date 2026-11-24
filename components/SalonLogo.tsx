import React from 'react';
import { Image, ImageProps } from 'react-native';
import images from '../constants/images';
import { useSalonLogoUrl } from '../lib/salonLogo';

type SalonLogoProps = Omit<ImageProps, 'source'> & {
  /** True where the logo sits on a photo: it's drawn white instead of ink. */
  onPhoto?: boolean;
};

// The salon logo, as set from the Home page (or the built-in one), drawn in the
// page's colour. A see-through PNG or WebP logo is recoloured to match, so the
// same upload works on the cream pages and on photos; a JPEG has its own
// background, so it is shown as it is.
const SalonLogo = ({ onPhoto = false, ...props }: SalonLogoProps) => {
  const url = useSalonLogoUrl();

  if (!url) {
    return (
      <Image
        resizeMode="contain"
        {...props}
        source={onPhoto ? images.logoTopOneWhite : images.logoTopOne}
      />
    );
  }

  const canRecolour = /\.(png|webp)(\?|$)/i.test(url);
  return (
    <Image
      resizeMode="contain"
      {...props}
      source={{ uri: url }}
      tintColor={canRecolour ? (onPhoto ? '#FFFFFF' : '#1A1817') : undefined}
    />
  );
};

export default SalonLogo;
