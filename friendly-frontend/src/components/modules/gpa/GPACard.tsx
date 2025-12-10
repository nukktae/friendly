import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GPACardProps {
  gpa: number;
  totalCredits: number;
}

export const GPACard: React.FC<GPACardProps> = ({ gpa, totalCredits }) => {
  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return '#10b981'; // green
    if (gpa >= 3.0) return '#3b82f6'; // blue
    if (gpa >= 2.5) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Current GPA</Text>
        <View style={styles.gpaRow}>
          <Text style={[styles.gpaValue, { color: getGPAColor(gpa) }]}>
            {gpa.toFixed(2)}
          </Text>
          <Text style={styles.outOf}>/ 4.0</Text>
        </View>
        <Text style={styles.creditsText}>
          {totalCredits} credits completed
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  gpaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  gpaValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  outOf: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 4,
  },
  creditsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
});

