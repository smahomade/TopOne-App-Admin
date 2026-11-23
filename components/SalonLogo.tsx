import React from 'react';
import { Image, ImageProps } from 'react-native';
import { useSalonLogo } from '../lib/salonLogo';

// The salon logo, as set from the Home page (or the built-in one).
const SalonLogo = (props: Omit<ImageProps, 'source'>) => {
  const source = useSalonLogo();
  return <Image resizeMode="contain" {...props} source={source} />;
};

export default SalonLogo;
