/**
 * Class and Product-related types
 */

export interface Class {
  id: number;
  name: string;
  price: string;
  priceValue: number;
  farm: string;
  images: string[];
  isFavorite: boolean;
  description: string;
  location: string;
  dietary: string[];
}

export type SortOption = "default" | "a-z" | "price";

// Re-export for backward compatibility
export type { Class as Product };

