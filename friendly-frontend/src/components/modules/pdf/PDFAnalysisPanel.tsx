import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
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
  onRefreshRequest?: (handler: () => void) => void;
}

export function PDFAnalysisPanel({
  pdf,
  userId,
  selectedPage,
  onPageSelect,
  onAnalysisComplete,
  onRefreshRequest,
}: PDFAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingPage, setIsAnalyzingPage] = useState(false);
  const [analysis, setAnalysis] = useState(pdf.analysis);
  const [pageAnalyses, setPageAnalyses] = useState(pdf.pageAnalyses || {});

  React.useEffect(() => {
    setAnalysis(pdf.analysis);
    setPageAnalyses(pdf.pageAnalyses || {});
  }, [pdf.analysis, pdf.pageAnalyses]);

  const handleAnalyzeFullPDF = useCallback(async () => {
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
  }, [pdf.id, userId, onAnalysisComplete]);

  // Expose refresh handler to parent
  React.useEffect(() => {
    if (onRefreshRequest && pdf.analysis) {
      onRefreshRequest(handleAnalyzeFullPDF);
    }
  }, [pdf.analysis, onRefreshRequest, handleAnalyzeFullPDF]);

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

      {/* Loading State */}
      {(isAnalyzing || isAnalyzingPage) && (
        <View style={styles.loadingContainer}>
          <SkeletonText lines={4} width="100%" />
          <SkeletonText lines={3} width="80%" style={{ marginTop: 16 }} />
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* Action Button - Full Width (only when not analyzed) */}
        {!analysis && (
          <TouchableOpacity
            style={styles.fullWidthActionButton}
            onPress={handleAnalyzeFullPDF}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.fullWidthActionButtonText}>AI Analyze Document</Text>
            )}
          </TouchableOpacity>
        )}
        {selectedPage && !pageAnalyses[selectedPage] && !analysis && (
          <TouchableOpacity
            style={styles.fullWidthActionButton}
            onPress={() => handleAnalyzePage(selectedPage)}
            disabled={isAnalyzingPage}
            activeOpacity={0.8}
          >
            {isAnalyzingPage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.fullWidthActionButtonText}>Analyze Page {selectedPage}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Document Analysis Results */}
        {analysis && (
          <>
            {/* Summary Card Block */}
            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardSectionLabel}>SUMMARY</Text>
                {analysis && (
                  <View style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={12} color="#6B7C32" />
                    <Text style={styles.badgeText}>Analyzed</Text>
                  </View>
                )}
              </View>
              <View style={styles.summaryContent}>
                {formatSummaryParagraphs(analysis.summary).map((paragraph, index, array) => (
                  <Text 
                    key={index} 
                    style={[
                      styles.summaryParagraph,
                      index === array.length - 1 && styles.summaryParagraphLast
                    ]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>

            {/* Key Points Card Block */}
            {analysis.keyPoints && analysis.keyPoints.length > 0 && (
              <View style={styles.keyPointsCard}>
                <Text style={styles.cardSectionLabel}>KEY POINTS</Text>
                <View style={styles.keyPointsList}>
                  {analysis.keyPoints.map((point, index) => (
                    <View key={index} style={styles.keyPointRow}>
                      <View style={styles.keyPointBullet} />
                      <Text style={styles.keyPointText}>{sanitizeText(point)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Selected Page Analysis */}
        {selectedPage && pageAnalyses[selectedPage] && (
          <>
            {/* Page Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.cardSectionLabel}>PAGE {selectedPage}</Text>
              <View style={styles.summaryContent}>
                {formatSummaryParagraphs(pageAnalyses[selectedPage].summary).map((paragraph: string, index: number, array: string[]) => (
                  <Text 
                    key={index} 
                    style={[
                      styles.summaryParagraph,
                      index === array.length - 1 && styles.summaryParagraphLast
                    ]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
            
            {/* Page Key Points Card */}
            {pageAnalyses[selectedPage].keyPoints && pageAnalyses[selectedPage].keyPoints.length > 0 && (
              <View style={styles.keyPointsCard}>
                <Text style={styles.cardSectionLabel}>KEY POINTS</Text>
                <View style={styles.keyPointsList}>
                  {pageAnalyses[selectedPage].keyPoints.map((point: string, index: number) => (
                    <View key={index} style={styles.keyPointRow}>
                      <View style={styles.keyPointBullet} />
                      <Text style={styles.keyPointText}>{sanitizeText(point)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
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
  loadingContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 16,
  },
  // Full Width Action Button
  fullWidthActionButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#6B7C32',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  fullWidthActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Card-based Design
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  keyPointsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7C32',
  },
  summaryContent: {
    marginTop: 0,
  },
  summaryParagraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 10,
  },
  summaryParagraphLast: {
    marginBottom: 0,
  },
  keyPointsList: {
    marginTop: 8,
    gap: 10,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  keyPointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7C32',
    marginTop: 8,
    flexShrink: 0,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  // Pages List Section
  pagesListSection: {
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pagesList: {
    gap: 8,
  },
  pageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageCardActive: {
    borderColor: '#6B7C32',
    backgroundColor: '#F9FAFB',
  },
  pageCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  pageCardSummary: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});
