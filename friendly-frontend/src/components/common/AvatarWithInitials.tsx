import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ImageStyle, StyleSheet, Text, View } from 'react-native';

interface AvatarWithInitialsProps {
  src?: string | null;
  name: string;
  size?: number;
  style?: ImageStyle;
}

// Helper function to get initials from name
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  // Split by space and get first name
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  
  if (!firstName) return '?';
  
  // Get first character and make it uppercase
  return firstName.charAt(0).toUpperCase();
};

// Helper function to get background color based on initial
const getBackgroundColor = (initial: string): string => {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f43f5e', // rose
    '#ef4444', // red
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#14b8a6', // teal
  ];
  
  const index = initial.charCodeAt(0) % colors.length;
  return colors[index];
};

export const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({
  src,
  name,
  size = 44,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(initials);
  const showInitials = !src || hasError;

  const handleError = () => {
    setHasError(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showInitials ? backgroundColor : 'transparent',
        },
        style,
      ]}
    >
      {showInitials ? (
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
            },
          ]}
        >
          {initials}
        </Text>
      ) : (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          onError={handleError}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AvatarWithInitials;

