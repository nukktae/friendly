import { Class, SortOption } from '@/src/types';

// Classes data (replacing products)
export const CLASSES: Class[] = [
  {
    id: 1,
    name: "Organic Herb Gardening",
    price: "$45.00",
    priceValue: 45.0,
    farm: "Greenhouse Lab A",
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Learn the fundamentals of growing organic herbs in small spaces. Perfect for beginners who want to start their own herb garden.",
    location: "Greenhouse Lab A - 2 hours",
    dietary: ["Beginner", "Hands-on", "Materials Included"],
  },
  {
    id: 2,
    name: "Sustainable Farming Techniques",
    price: "$60.00",
    priceValue: 60.0,
    farm: "Lecture Hall B",
    images: [
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Master sustainable farming practices that benefit both the environment and your harvest. Learn eco-friendly techniques from industry experts.",
    location: "Lecture Hall B - 1.5 hours",
    dietary: ["Intermediate", "Theory", "Certificate"],
  },
  {
    id: 3,
    name: "Composting Workshop",
    price: "$30.00",
    priceValue: 30.0,
    farm: "Garden Center",
    images: [
      "https://images.unsplash.com/photo-1416436917567-581c984c0b3b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Turn your kitchen scraps into black gold! Learn composting techniques to create nutrient-rich soil for your garden.",
    location: "Garden Center - 1 hour",
    dietary: ["Beginner", "Practical", "Take Home Kit"],
  },
  {
    id: 4,
    name: "Hydroponic Systems Design",
    price: "$85.00",
    priceValue: 85.0,
    farm: "Tech Lab C",
    images: [
      "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Design and build your own hydroponic system. Advanced techniques for soilless cultivation and maximizing plant growth.",
    location: "Tech Lab C - 3 hours",
    dietary: ["Advanced", "Build Project", "Equipment Included"],
  },
  {
    id: 5,
    name: "Plant Disease Identification",
    price: "$40.00",
    priceValue: 40.0,
    farm: "Field Station",
    images: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Learn to identify and treat common plant diseases. Essential knowledge for maintaining healthy crops and gardens.",
    location: "Field Station - 2 hours",
    dietary: ["Intermediate", "Diagnostic Tools", "Field Guide"],
  },
  {
    id: 6,
    name: "Urban Farming Solutions",
    price: "$55.00",
    priceValue: 55.0,
    farm: "Rooftop Garden",
    images: [
      "https://images.unsplash.com/photo-1416436917567-581c984c0b3b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Maximize food production in urban environments. Learn vertical farming, container gardening, and space optimization techniques.",
    location: "Rooftop Garden - 2.5 hours",
    dietary: ["Intermediate", "Urban Focus", "Site Visit"],
  },
  {
    id: 7,
    name: "Seed Starting Masterclass",
    price: "$35.00",
    priceValue: 35.0,
    farm: "Greenhouse Lab B",
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Master the art of starting plants from seeds. Learn germination techniques, timing, and how to raise strong seedlings.",
    location: "Greenhouse Lab B - 1.5 hours",
    dietary: ["Beginner", "Starter Kit", "Seasonal"],
  },
  {
    id: 8,
    name: "Permaculture Principles",
    price: "$70.00",
    priceValue: 70.0,
    farm: "Outdoor Classroom",
    images: [
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Design sustainable ecosystems using permaculture principles. Create self-sustaining agricultural systems that work with nature.",
    location: "Outdoor Classroom - 4 hours",
    dietary: ["Advanced", "Design Project", "Lunch Included"],
  },
  {
    id: 9,
    name: "Advanced Fermentation",
    price: "$75.00",
    priceValue: 75.0,
    farm: "Lab Kitchen",
    images: [
      "https://images.unsplash.com/photo-1623003012928-2db1ca5e6ef4?w=400&h=300&fit=crop",
    ],
    isFavorite: false,
    description: "Dive deep into the art of fermentation. Learn to create kimchi, sauerkraut, kombucha, and other fermented foods for health and flavor.",
    location: "Lab Kitchen - 3.5 hours",
    dietary: ["Advanced", "Tasting Session", "Recipes Included"],
  },
];

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
