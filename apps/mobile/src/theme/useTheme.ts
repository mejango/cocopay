import { useBrandStore } from '../stores/brand';
import { BRANDS, type BrandTheme } from './brands';

export function useTheme(): BrandTheme {
  const brandKey = useBrandStore((state) => state.brandKey);
  return BRANDS[brandKey];
}
