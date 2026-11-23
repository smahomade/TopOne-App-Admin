import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { supabase } from './supabase';
import { images } from '../constants';

// The salon logo both apps show. Staff change it from the Home page; it's kept
// as `logo_url` in app_settings, and the built-in logo is used until one is set.
// Keep in step with the customer app's lib/salonLogo.ts.

export const LOGO_SETTING_KEY = 'logo_url';

// undefined until the first load finishes.
let logoUrl: string | null | undefined;
let loadingLogo: Promise<void> | null = null;
const listeners = new Set<(url: string | null) => void>();

export function setSalonLogoUrl(url: string | null) {
  logoUrl = url;
  listeners.forEach((listener) => listener(url));
}

async function loadSalonLogo() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', LOGO_SETTING_KEY)
    .maybeSingle();

  // On an error the built-in logo stays, and the next screen tries again.
  if (!error) {
    setSalonLogoUrl(data?.value ?? null);
  }
}

export function useSalonLogoUrl() {
  const [url, setUrl] = useState<string | null>(logoUrl ?? null);

  useEffect(() => {
    listeners.add(setUrl);

    if (logoUrl === undefined && !loadingLogo) {
      loadingLogo = loadSalonLogo().finally(() => {
        loadingLogo = null;
      });
    }

    return () => {
      listeners.delete(setUrl);
    };
  }, []);

  return url;
}

export function useSalonLogo(): ImageSourcePropType {
  const url = useSalonLogoUrl();
  return url ? { uri: url } : images.logoTopOneWhite;
}
