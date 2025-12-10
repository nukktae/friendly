import { Class, SortOption } from '@/src/types';

// Empty classes array - classes are now loaded from the backend API (lectures)
export const CLASSES: Class[] = [];

// For backward compatibility
export const PRODUCTS = CLASSES;

export class ClassesService {
  static getAllClasses(): Class[] {
    return CLASSES;
  }

  static getClassById(id: number): Class | undefined {
    return CLASSES.find(cls => cls.id === id);
  }

  static filterClasses(classes: Class[], searchTerm: string): Class[] {
    return classes.filter((cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  static sortClasses(classes: Class[], sortOption: SortOption): Class[] {
    switch (sortOption) {
      case "a-z":
        return classes.sort((a, b) => a.name.localeCompare(b.name));
      case "price":
        return classes.sort((a, b) => a.priceValue - b.priceValue);
      default:
        return classes;
    }
  }

  static filterAndSortClasses(classes: Class[], searchTerm: string, sortOption: SortOption): Class[] {
    const filtered = this.filterClasses(classes, searchTerm);
    return this.sortClasses(filtered, sortOption);
  }
}
