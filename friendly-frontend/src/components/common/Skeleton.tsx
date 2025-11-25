import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style,
  animated = true 
}: SkeletonProps) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (animated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animated, fadeAnim]);

  if (animated) {
    return (
      <Animated.View
        style={[
          styles.skeleton,
          {
            width,
            height,
            borderRadius,
            opacity: fadeAnim,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  width?: number | string;
  lastLineWidth?: number | string;
  style?: any;
}

export function SkeletonText({ 
  lines = 3, 
  width = '100%',
  lastLineWidth = '60%',
  style 
}: SkeletonTextProps) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : width}
          height={16}
          borderRadius={4}
          style={[
            styles.textLine,
            index < lines - 1 && styles.textLineMargin,
          ]}
        />
      ))}
    </View>
  );
}

interface SkeletonCardProps {
  style?: any;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={60} height={60} borderRadius={8} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} borderRadius={4} />
        <Skeleton width="60%" height={14} borderRadius={4} style={styles.cardSubtitle} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  style?: any;
}

export function SkeletonList({ count = 3, itemHeight = 60, style }: SkeletonListProps) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard
          key={index}
          style={[
            styles.listItem,
            index < count - 1 && styles.listItemMargin,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  textContainer: {
    width: '100%',
  },
  textLine: {
    marginBottom: 8,
  },
  textLineMargin: {
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardSubtitle: {
    marginTop: 8,
  },
  listItem: {
    marginBottom: 12,
  },
  listItemMargin: {
    marginBottom: 12,
  },
});

