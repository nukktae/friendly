# Types

This directory contains all TypeScript type definitions for the application, organized by domain.

## Structure

Types are split into domain-specific files:

- **`auth.types.ts`** - Authentication and user-related types
- **`cart.types.ts`** - Shopping cart and order types  
- **`class.types.ts`** - Class/product types
- **`index.ts`** - Barrel export (re-exports all types)

## Guidelines

### When to Add New Types

Create a new type file when:
- A domain has 3+ related interfaces
- Types are shared across multiple features
- You want to improve code organization

### Example Type File Structure

```typescript
// feature.types.ts

/**
 * Description of what this type represents
 */
export interface FeatureData {
  id: string;
  name: string;
  // ... other fields
}

/**
 * Props for feature components
 */
export interface FeatureProps {
  data: FeatureData;
  onAction: () => void;
}

// Type aliases for clarity
export type FeatureId = string;
export type FeatureStatus = 'active' | 'inactive' | 'pending';
```

## Import Usage

```typescript
// Import types from the barrel export
import type { User, UserProfile, CartItem, Class } from '@/src/types';

// Or import from specific files if needed
import type { User } from '@/src/types/auth.types';
```

## Best Practices

1. **Documentation** - Add JSDoc comments for complex types
2. **Naming** - Use descriptive names (e.g., `UserProfile` not `UP`)
3. **Interfaces vs Types**:
   - Use `interface` for object shapes that may be extended
   - Use `type` for unions, intersections, and primitives
4. **Export Everything** - Export all types that might be used elsewhere
5. **Avoid Any** - Always provide proper types instead of `any`

## Future Expansion

As the app grows, consider adding:
- `schedule.types.ts` - Schedule and calendar types
- `community.types.ts` - Community and social features
- `tutorial.types.ts` - Tutorial and onboarding types
- `api.types.ts` - API request/response types

