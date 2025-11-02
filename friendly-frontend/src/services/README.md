# Services

This directory contains all business logic and API services for the application, organized by domain.

## Structure

Each service has its own subdirectory:

- **`/auth`** - Authentication and user management
- **`/calendar`** - Google Calendar integration
- **`/cart`** - Shopping cart operations
- **`/classes`** - Class/product data management
- **`/firestore`** - Firestore database operations
- **`/schedule`** - Schedule AI and storage services
- **`/tutorial`** - Tutorial and onboarding logic

## Guidelines

### Service Responsibilities
Services should:
- Handle API calls and data fetching
- Contain business logic
- Be stateless (no internal state management)
- Be reusable across different screens
- Handle error cases
- Provide type-safe interfaces

Services should NOT:
- Handle UI rendering
- Manage component state (use Context/hooks instead)
- Contain navigation logic

### Example Service Structure

```typescript
// featureService.ts
import { SomeType } from '@/src/types';

export class FeatureService {
  static async getData(): Promise<SomeType> {
    // Business logic here
    return data;
  }

  static async postData(data: SomeType): Promise<void> {
    // API call here
  }
}

// Or singleton pattern for stateful services
class FeatureService {
  private static instance: FeatureService;
  
  private constructor() {
    // Initialize
  }
  
  static getInstance(): FeatureService {
    if (!FeatureService.instance) {
      FeatureService.instance = new FeatureService();
    }
    return FeatureService.instance;
  }
  
  async someMethod(): Promise<void> {
    // Implementation
  }
}

export default FeatureService.getInstance();
```

## Import Usage

```typescript
// Use barrel exports for cleaner imports
import { AuthService, CartService, FirestoreService } from '@/src/services';

// Or import directly when needed
import tutorialService from '@/src/services/tutorial/tutorialService';
```

## Best Practices

1. **Error Handling** - Always handle and log errors appropriately
2. **Type Safety** - Use TypeScript interfaces for all data structures
3. **Async/Await** - Use modern async patterns
4. **Separation of Concerns** - Keep services focused on their domain
5. **Testing** - Write unit tests for service logic

