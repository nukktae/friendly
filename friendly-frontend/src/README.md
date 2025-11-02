# Source Code Structure

This directory contains all the source code for the Friendly mobile application.

## Directory Structure

### 📱 `/screens`
Screen components organized by feature. Each screen represents a full-page view in the app.
- All screens should be thin wrappers that compose components and handle navigation
- Business logic should be in services or hooks
- **Import**: `import { LoginScreen, SignupScreen } from '@/src/screens'`

### 🔧 `/services`
Business logic and API services organized by domain.
- Each service handles a specific domain (auth, calendar, cart, etc.)
- Services should be stateless and reusable
- **Import**: `import { AuthService, CartService } from '@/src/services'`

### 🧩 `/components`
Reusable UI components organized by category:
- `common/` - Shared components used across features
- `custom/` - Custom themed components
- `schedule/` - Schedule-specific components
- `tutorial/` - Tutorial overlay components
- `ui/` - Base UI components (buttons, inputs, etc.)

### 🎨 `/types`
TypeScript type definitions organized by domain:
- `auth.types.ts` - Authentication and user types
- `cart.types.ts` - Shopping cart and order types
- `class.types.ts` - Class and product types
- **Import**: `import type { User, CartItem } from '@/src/types'`

### ⚙️ `/config`
Configuration files for the application:
- `env.ts` - Environment variables
- `firebase.ts` - Firebase configuration

### 🔌 `/context`
React Context providers for global state management:
- `AppContext.tsx` - Main application context

### 🪝 `/hooks`
Custom React hooks for reusable logic:
- Theme-related hooks
- Color scheme hooks

### 📊 `/data`
Mock data and constants:
- Static data used for development/testing

### 🎯 `/constants`
Application-wide constants:
- Theme colors
- Configuration values

### 🛠️ `/lib`
Utility functions and helpers:
- `utils.ts` - Common utility functions (cn, etc.)

## Import Conventions

```typescript
// Screens - use barrel exports
import { LoginScreen, SignupScreen } from '@/src/screens';

// Services - use barrel exports
import { AuthService, CartService } from '@/src/services';

// Types - use barrel exports
import type { User, CartItem, Class } from '@/src/types';

// Components - import directly
import { Button } from '@/src/components/ui/button';
import AddToCartOverlay from '@/src/components/common/AddToCartOverlay';

// Utils
import { cn } from '@/src/lib/utils';
```

## Best Practices

1. **Keep screens thin** - Move business logic to services or hooks
2. **Use TypeScript** - Always define types for props and state
3. **Organize by feature** - Group related files together
4. **Follow naming conventions**:
   - Screens: `FeatureScreen.tsx`
   - Components: `PascalCase.tsx`
   - Services: `featureService.ts`
   - Types: `feature.types.ts`
5. **Export properly** - Use barrel exports for easier imports

