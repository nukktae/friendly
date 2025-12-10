import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SuggestedClass } from '@/src/types/gpa.types';
import { getNextFutureSemester, parseSemester, compareSemesters } from '@/src/utils/semester';

interface SuggestedClassesSectionProps {
  suggestions: SuggestedClass[];
  loading?: boolean;
  onAddManual: (name: string, credits: number) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
}

export const SuggestedClassesSection: React.FC<SuggestedClassesSectionProps> = ({
  suggestions,
  loading = false,
  onAddManual,
  onRemove,
  onRefresh,
}) => {
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCredits, setManualCredits] = useState('');

  const handleAddManual = () => {
    if (!manualName.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }
    if (!manualCredits || parseFloat(manualCredits) <= 0) {
      Alert.alert('Error', 'Please enter valid credits');
      return;
    }

    onAddManual(manualName.trim(), parseFloat(manualCredits));
    setManualName('');
    setManualCredits('');
    setShowAddManual(false);
  };

  // Filter AI suggestions to only show for future semesters
  const nextFutureSemester = useMemo(() => getNextFutureSemester(), []);
  
  const aiSuggestions = useMemo(() => {
    const allAI = suggestions.filter((s) => s.isAI);
    
    return allAI.filter((suggestion) => {
      // If suggestion has semester info, check if it's for a future semester
      if (suggestion.semester) {
        const suggestionParsed = parseSemester(suggestion.semester);
        const nextParsed = parseSemester(nextFutureSemester);
        
        if (suggestionParsed && nextParsed) {
          // Check if suggestion semester is >= next future semester
          // compareSemesters returns negative if a < b, positive if a > b
          // We want suggestion.semester >= nextFutureSemester
          // So we check: if suggestion year > next year, or (same year and suggestion semester >= next semester)
          if (suggestionParsed.year > nextParsed.year) {
            return true; // Future year
          }
          if (suggestionParsed.year === nextParsed.year) {
            return suggestionParsed.semester >= nextParsed.semester; // Same year, check semester
          }
          return false; // Past year
        }
      }
      
      // If no semester info, show suggestion (for backward compatibility)
      // But filter by creation date to ensure relevance
      const now = new Date();
      const created = new Date(suggestion.createdAt);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      
      // Only show suggestions created in the last 6 months (relevant for future planning)
      return created >= sixMonthsAgo;
    });
  }, [suggestions, nextFutureSemester]);
  
  const manualSuggestions = suggestions.filter((s) => !s.isAI);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested Classes</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color="#426b1f" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#426b1f" />
          <Text style={styles.loadingText}>Generating suggestions...</Text>
        </View>
      )}

      {aiSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Suggestions</Text>
          {aiSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionCard}>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                <Text style={styles.suggestionCredits}>
                  {suggestion.credits} credits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemove(suggestion.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {manualSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Planned Classes</Text>
          {manualSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionCard}>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionCredits}>
                  {suggestion.credits} credits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemove(suggestion.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!showAddManual ? (
        <TouchableOpacity
          onPress={() => setShowAddManual(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color="#426b1f" />
          <Text style={styles.addButtonText}>Add Planned Class</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addManualForm}>
          <TextInput
            style={styles.input}
            placeholder="Class name"
            value={manualName}
            onChangeText={setManualName}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[styles.input, styles.creditsInput]}
            placeholder="Credits"
            value={manualCredits}
            onChangeText={setManualCredits}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.addManualActions}>
            <TouchableOpacity
              onPress={() => {
                setShowAddManual(false);
                setManualName('');
                setManualCredits('');
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddManual} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {suggestions.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No suggestions yet</Text>
          <Text style={styles.emptySubtext}>
            Add courses to get personalized class suggestions
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  suggestionCredits: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#426b1f',
  },
  addManualForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  creditsInput: {
    width: 100,
  },
  addManualActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#426b1f',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});

