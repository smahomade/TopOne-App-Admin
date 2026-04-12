import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type LocationOption = {
  id: string;
  name: string;
};

type LocationContextType = {
  selectedLocationId: string | null;
  selectedLocationName: string;
  locations: LocationOption[];
  setSelectedLocation: (id: string, name: string) => void;
  refreshLocations: () => Promise<void>;
};

const LocationContext = createContext<LocationContextType>({
  selectedLocationId: null,
  selectedLocationName: '',
  locations: [],
  setSelectedLocation: () => {},
  refreshLocations: async () => {},
});

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) return;
    setLocations(data);
    if (!initializedRef.current) {
      initializedRef.current = true;
      setSelectedLocationId(data[0].id);
      setSelectedLocationName(data[0].name);
    }
  };

  const setSelectedLocation = (id: string, name: string) => {
    setSelectedLocationId(id);
    setSelectedLocationName(name);
  };

  return (
    <LocationContext.Provider
      value={{ selectedLocationId, selectedLocationName, locations, setSelectedLocation, refreshLocations: fetchLocations }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
