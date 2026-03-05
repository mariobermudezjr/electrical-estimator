'use client';

import { useRef, useEffect } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

export interface PlaceSelection {
  street: string;
  city: string;
  state: string;
}

interface AddressAutocompleteProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceSelection) => void;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  ...inputProps
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const { isLoaded } = useGooglePlaces();

  // Keep refs current without triggering effect re-runs
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      types: ['address'],
      fields: ['address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place?.address_components) return;

      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';

      for (const component of place.address_components) {
        const type = component.types[0];
        if (type === 'street_number') {
          streetNumber = component.long_name;
        } else if (type === 'route') {
          route = component.long_name;
        } else if (type === 'locality') {
          city = component.long_name;
        } else if (type === 'administrative_area_level_1') {
          state = component.short_name;
        }
      }

      const street = streetNumber ? `${streetNumber} ${route}` : route;

      onChangeRef.current(street);
      onPlaceSelectRef.current?.({ street, city, state });
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [isLoaded]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...inputProps}
    />
  );
}
