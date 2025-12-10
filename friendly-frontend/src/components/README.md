# Components

This directory contains all reusable UI components for the application, organized by category.

## Structure

- **`/common`** - Shared components used across features
  - AddToCartOverlay, EmptyState, StatusBar, etc.
- **`/custom`** - Custom themed components
  - Haptic feedback, themed text/views, etc.
- **`/schedule`** - Schedule-specific components
  - Calendar views, modals, upload components
- **`/tutorial`** - Tutorial and onboarding overlays
- **`/ui`** - Base UI library components
  - Buttons, inputs, cards, dialogs, etc.

## Guidelines

### Component Responsibilities

Components should:
- Be reusable and composable
- Accept props for customization
- Handle their own internal state
- Be self-contained and testable
- Follow a consistent API design

Components should NOT:
- Make direct API calls (use services)
- Handle navigation (parent's responsibility)
- Have hard-coded business logic

### Example Component Structure

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: CustomButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#6B7C32',
  },
  secondary: {
    backgroundColor: '#e5e7eb',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

## Component Categories

### Common Components
General-purpose components used throughout the app:
```typescript
import AddToCartOverlay from '@/src/components/common/AddToCartOverlay';
import EmptyState from '@/src/components/common/EmptyState';
```

### UI Components
Base design system components (based on shadcn/ui):
```typescript
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
```

### Feature-Specific Components
Components tied to specific features:
```typescript
import DragDropCalendar from '@/src/components/modules/schedule/DragDropCalendar';
import TutorialOverlay from '@/src/components/modules/tutorial/TutorialOverlay';
```

## Best Practices

1. **Props Interface** - Always define TypeScript interfaces for props
2. **Default Props** - Provide sensible defaults for optional props
3. **Styling** - Use StyleSheet.create() for performance
4. **Composition** - Build complex components from simpler ones
5. **Accessibility** - Include proper accessibility props
6. **Documentation** - Add comments for complex component logic
7. **Testing** - Write tests for component behavior

## UI Component Library

The `/ui` directory contains a comprehensive set of base components inspired by shadcn/ui:
- Layout: Card, Separator, Scroll Area
- Forms: Button, Input, Select, Checkbox, Radio
- Feedback: Alert, Toast, Dialog, Progress
- Navigation: Tabs, Breadcrumb, Dropdown Menu
- Data Display: Table, Badge, Avatar

All UI components use the `cn()` utility from `@/src/lib/utils` for className merging.

