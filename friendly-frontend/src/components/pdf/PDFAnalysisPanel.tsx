import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PDFFile, analyzePDF, analyzePDFPage } from '@/src/services/pdf/pdfService';
import { SkeletonText } from '@/src/components/common/Skeleton';

interface PDFAnalysisPanelProps {
  pdf: PDFFile;
  userId: string;
  selectedPage?: number | null;
  onPageSelect?: (page: number | null) => void;
  onAnalysisComplete?: () => void;
}

export function PDFAnalysisPanel({
  pdf,
  userId,
  selectedPage,
  onPageSelect,
  onAnalysisComplete,
}: PDFAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingPage, setIsAnalyzingPage] = useState(false);
  const [analysis, setAnalysis] = useState(pdf.analysis);
  const [pageAnalyses, setPageAnalyses] = useState(pdf.pageAnalyses || {});

  React.useEffect(() => {
    setAnalysis(pdf.analysis);
    setPageAnalyses(pdf.pageAnalyses || {});
  }, [pdf.analysis, pdf.pageAnalyses]);

  const handleAnalyzeFullPDF = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzePDF(pdf.id, userId);
      const analysisData = {
        ...result,
        analyzedAt: typeof result.analyzedAt === 'string' 
          ? result.analyzedAt 
          : result.analyzedAt?.toISOString?.() || new Date().toISOString(),
      };
      setAnalysis(analysisData as any);
      onAnalysisComplete?.();
    } catch (error: any) {
      console.error('Error analyzing PDF:', error);
      Alert.alert('Error', error.message || 'Failed to analyze PDF');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzePage = async (pageNumber: number) => {
    setIsAnalyzingPage(true);
    try {
      const result = await analyzePDFPage(pdf.id, userId, pageNumber);
      const pageAnalysisData = {
        ...result,
        analyzedAt: typeof result.analyzedAt === 'string' 
          ? result.analyzedAt 
          : result.analyzedAt.toISOString(),
      };
      setPageAnalyses(prev => ({
        ...prev,
        [pageNumber]: pageAnalysisData,
      }));
      onAnalysisComplete?.();
    } catch (error: any) {
      console.error('Error analyzing PDF page:', error);
      Alert.alert('Error', error.message || 'Failed to analyze PDF page');
    } finally {
      setIsAnalyzingPage(false);
    }
  };

  const formatDate = (date: string | { _seconds: number; _nanoseconds: number } | undefined) => {
    if (!date) return 'Unknown';
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    const seconds = (date as any)._seconds || (date as any).seconds || 0;
    return new Date(seconds * 1000).toLocaleDateString();
  };

  const sanitizeText = (text: string): string => {
    if (!text) return '';
    // Remove any React/HTML-like elements that might have been accidentally included
    return text
      .replace(/<View[^>]*>.*?<\/View>/gis, '')
      .replace(/<View[^>]*\/>/gis, '')
      .replace(/<div[^>]*>.*?<\/div>/gis, '')
      .replace(/<div[^>]*\/>/gis, '')
      .replace(/\[Object\]/g, '')
      .replace(/\[Array\]/g, '')
      .replace(/ref=\{null\}/g, '')
      .replace(/style="[^"]*"/g, '')
      .replace(/style=\{[^}]*\}/g, '')
      .replace(/children="[^"]*"/g, '')
      .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const formatSummaryParagraphs = (summary: string): string[] => {
    if (!summary) return [];
    const sanitized = sanitizeText(summary);
    // Split by double newlines (paragraph breaks)
    const paragraphs = sanitized.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    // If no double newlines, try single newlines
    if (paragraphs.length === 1 && sanitized.includes('\n')) {
      return sanitized.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    }
    return paragraphs.length > 0 ? paragraphs : [sanitized];
  };

  const analyzedPagesCount = Object.keys(pageAnalyses).length;

  return (
    <View style={styles.container}>
      {/* Header - Minimal */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Summary</Text>
        {analysis && (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={14} color="#6B7C32" />
            <Text style={styles.badgeText}>Analyzed</Text>
          </View>
        )}
      </View>

      {/* Loading State */}
      {(isAnalyzing || isAnalyzingPage) && (
        <View style={styles.loadingContainer}>
          <SkeletonText lines={4} width="100%" />
          <SkeletonText lines={3} width="80%" style={{ marginTop: 16 }} />
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {!analysis && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAnalyzeFullPDF}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#6B7C32" />
              ) : (
                <Text style={styles.actionButtonText}>Analyze Document</Text>
              )}
            </TouchableOpacity>
          )}
          {selectedPage && !pageAnalyses[selectedPage] && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAnalyzePage(selectedPage)}
              disabled={isAnalyzingPage}
            >
              {isAnalyzingPage ? (
                <ActivityIndicator size="small" color="#6B7C32" />
              ) : (
                <Text style={styles.actionButtonText}>Analyze Page {selectedPage}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Document Analysis Results */}
        {analysis && (
          <View style={styles.analysisCard}>
            {/* Summary Section */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryContent}>
                {formatSummaryParagraphs(analysis.summary).map((paragraph, index) => (
                  <Text key={index} style={styles.summaryParagraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>

            {/* Key Points Section */}
            {analysis.keyPoints && analysis.keyPoints.length > 0 && (
              <View style={styles.keyPointsSection}>
                <Text style={styles.sectionTitle}>Key Points</Text>
                <View style={styles.keyPointsList}>
                  {analysis.keyPoints.map((point, index) => (
                    <View key={index} style={styles.keyPointRow}>
                      <Text style={styles.keyPointBullet}>•</Text>
                      <Text style={styles.keyPointText}>{sanitizeText(point)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Selected Page Analysis */}
        {selectedPage && pageAnalyses[selectedPage] && (
          <View style={styles.pageAnalysisCard}>
            <View style={styles.pageAnalysisContent}>
                {/* Summary Section */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Page {selectedPage}</Text>
                  <View style={styles.summaryContent}>
                    {formatSummaryParagraphs(pageAnalyses[selectedPage].summary).map((paragraph: string, index: number) => (
                      <Text key={index} style={styles.summaryParagraph}>
                        {paragraph}
                      </Text>
                    ))}
                  </View>
                </View>
                
                {/* Key Points Section */}
                {pageAnalyses[selectedPage].keyPoints && pageAnalyses[selectedPage].keyPoints.length > 0 && (
                  <View style={styles.keyPointsSection}>
                    <Text style={styles.sectionTitle}>Key Points</Text>
                    <View style={styles.keyPointsList}>
                      {pageAnalyses[selectedPage].keyPoints.map((point: string, index: number) => (
                        <View key={index} style={styles.keyPointRow}>
                          <Text style={styles.keyPointBullet}>•</Text>
                          <Text style={styles.keyPointText}>{sanitizeText(point)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Page-by-Page Analysis List */}
        {analyzedPagesCount > 0 && (
          <View style={styles.pagesListSection}>
            <Text style={styles.sectionHeaderTitle}>
              Analyzed Pages ({analyzedPagesCount})
            </Text>
            <View style={styles.pagesList}>
              {Object.entries(pageAnalyses)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([pageNum, pageAnalysis]: [string, any]) => (
                  <TouchableOpacity
                    key={pageNum}
                    style={[
                      styles.pageCard,
                      selectedPage === parseInt(pageNum) && styles.pageCardActive
                    ]}
                    onPress={() => {
                      // Toggle selection: if already selected, unselect; otherwise select
                      if (selectedPage === parseInt(pageNum)) {
                        onPageSelect?.(null);
                      } else {
                        onPageSelect?.(parseInt(pageNum));
                      }
                    }}
                  >
                    <Text style={styles.pageCardTitle}>Page {pageNum}</Text>
                    <Text style={styles.pageCardSummary} numberOfLines={selectedPage === parseInt(pageNum) ? undefined : 1}>
                      {sanitizeText(pageAnalysis.summary)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C32',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 24,
  },
  // Actions Row - Compact Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 36,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7C32',
  },
  // Analysis Cards - Minimal Design
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
  },
  pageAnalysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryContent: {
    marginTop: 4,
  },
  summaryParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#111827',
    marginBottom: 16,
  },
  keyPointsSection: {
    marginTop: 24,
  },
  keyPointsList: {
    marginTop: 8,
    gap: 10,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  keyPointBullet: {
    fontSize: 14,
    color: '#6B7C32',
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  pageAnalysisContent: {
    gap: 24,
  },
  // Pages List Section - Minimal
  pagesListSection: {
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pagesList: {
    gap: 8,
  },
  pageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pageCardActive: {
    borderColor: '#6B7C32',
    backgroundColor: '#f9fafb',
  },
  pageCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pageCardSummary: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
});
