import type { CategoryKey } from "./categories";

// Curated Unsplash photos per category — static URLs, no API key needed.
// Multiple images per category: deterministic pick via post.id % length.
const CATEGORY_IMAGE_MAP: Record<CategoryKey, string[]> = {
  household: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=70&auto=format",
  ],
  moving: [
    "https://images.unsplash.com/photo-1600518464441-9306d5c69f8c?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1560472355-536de3962603?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=800&q=70&auto=format",
  ],
  repairs: [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=70&auto=format",
  ],
  garden: [
    "https://images.unsplash.com/photo-1532211387405-12202cb81d7b?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1599598425947-5202edd56bdb?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=70&auto=format",
  ],
  auto: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&q=70&auto=format",
  ],
  childcare: [
    "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=70&auto=format",
  ],
  pets: [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=70&auto=format",
  ],
  it: [
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=70&auto=format",
  ],
  tutoring: [
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=70&auto=format",
  ],
  other: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70&auto=format",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=70&auto=format",
  ],
};

/** Returns a deterministic category image URL for a post. */
export function getCategoryImage(category: string, postId: number): string {
  const images = CATEGORY_IMAGE_MAP[category as CategoryKey] ?? CATEGORY_IMAGE_MAP.other;
  return images[postId % images.length];
}
