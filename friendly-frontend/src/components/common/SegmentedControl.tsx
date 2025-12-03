import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [animValue] = React.useState(new Animated.Value(selectedIndex));

  React.useEffect(() => {
    Animated.spring(animValue, {
      toValue: selectedIndex,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [selectedIndex]);

  const containerStyle = [
    styles.container,
    isDark && styles.containerDark,
  ];

  const getOptionStyle = (index: number) => {
    const isSelected = index === selectedIndex;
    return [
      styles.option,
      isSelected && styles.optionSelected,
      isSelected && isDark && styles.optionSelectedDark,
      !isSelected && isDark && styles.optionUnselectedDark,
    ];
  };

  const getOptionTextStyle = (index: number) => {
    const isSelected = index === selectedIndex;
    return [
      styles.optionText,
      isSelected && styles.optionTextSelected,
      isSelected && isDark && styles.optionTextSelectedDark,
      !isSelected && styles.optionTextUnselected,
      !isSelected && isDark && styles.optionTextUnselectedDark,
    ];
  };

  return (
    <View style={containerStyle}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={option}
          style={getOptionStyle(index)}
          onPress={() => onSelect(index)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: index === selectedIndex }}
          accessibilityLabel={`${option} view`}
        >
          <Text style={getOptionTextStyle(index)}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  containerDark: {
    backgroundColor: '#1E1E1E',
  },
  option: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1F5D43',
  },
  optionSelectedDark: {
    backgroundColor: '#161616',
    borderColor: '#6EF2B6',
    borderWidth: 1.5,
  },
  optionUnselectedDark: {
    backgroundColor: 'transparent',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6F6F6F',
  },
  optionTextSelected: {
    color: '#1F5D43',
    fontWeight: '600',
  },
  optionTextSelectedDark: {
    color: '#6EF2B6',
  },
  optionTextUnselected: {
    color: '#6F6F6F',
  },
  optionTextUnselectedDark: {
    color: '#A8A8A8',
  },
});

export default SegmentedControl;

