import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { PDFFile, updatePDFAnnotations } from '@/src/services/pdf/pdfService';
import { getPDFDownloadUrl } from '@/src/services/pdf/pdfService';
import { PDFAnalysisPanel } from './PDFAnalysisPanel';
import { PDFChatPanel } from './PDFChatPanel';
import { Skeleton, SkeletonText } from '@/src/components/common/Skeleton';

// Type declaration for PDF.js loaded from CDN
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Load PDF.js only on web
let pdfjsLib: any = null;
let pdfjsLoading = false;
let pdfjsAvailable = false;

const loadPDFJS = async () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    pdfjsAvailable = false;
    return false;
  }

  if (pdfjsAvailable && pdfjsLib) return true;
  if (pdfjsLoading) return false;

  pdfjsLoading = true;

  try {
    // Check if PDF.js is already loaded via script tag
    if (window.pdfjsLib) {
      pdfjsLib = window.pdfjsLib;
      
      // Set worker source after loading
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js';
      }

      pdfjsAvailable = true;
      window.dispatchEvent(new Event('pdfjs-loaded'));
      pdfjsLoading = false;
      return true;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="pdf.js"]');
    if (existingScript) {
      // Wait for existing script to load
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.pdfjsLib) {
            clearInterval(checkInterval);
            pdfjsLib = window.pdfjsLib;
            
            // Set worker source after loading
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js';
            }

            pdfjsAvailable = true;
            window.dispatchEvent(new Event('pdfjs-loaded'));
            pdfjsLoading = false;
            resolve(true);
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error('PDF.js script exists but pdfjsLib not found after timeout');
          pdfjsAvailable = false;
          pdfjsLoading = false;
          resolve(false);
        }, 5000);
      });
    }

    // Load from CDN via script tag (stable version 3.10.111)
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.min.js';
      script.async = true;
      script.onload = () => {
        // PDF.js is available as window.pdfjsLib after script loads
        if (window.pdfjsLib) {
          pdfjsLib = window.pdfjsLib;
          
          // Set worker source AFTER loading
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js';
          }

          pdfjsAvailable = true;
          window.dispatchEvent(new Event('pdfjs-loaded'));
          pdfjsLoading = false;
          resolve(true);
        } else {
          console.error('PDF.js script loaded but pdfjsLib not found on window object');
          pdfjsAvailable = false;
          pdfjsLoading = false;
          resolve(false);
        }
      };
      script.onerror = () => {
        console.error('Failed to load PDF.js from CDN');
        pdfjsAvailable = false;
        pdfjsLoading = false;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  } catch (err) {
    console.error('PDF.js load error:', err);
    pdfjsAvailable = false;
    pdfjsLoading = false;
    return false;
  }
};

// Inject CSS for text layer (web only)
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
  const existingStyle = document.getElementById('pdfjs-textlayer-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'pdfjs-textlayer-styles';
    style.innerHTML = `
      .pdf-text-layer {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: auto;
        user-select: text;
        color: transparent;
        z-index: 3;
        --scale-factor: 1; /* Default scale, will be overridden per page */
      }
      .pdf-text-layer > div {
        position: absolute;
        white-space: pre;
        user-select: text;
        pointer-events: auto;
        transform-origin: 0 0;
        line-height: 1;
      }
      canvas {
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

type TabType = 'summary' | 'chat';

interface PDFViewerProps {
  visible: boolean;
  pdf: PDFFile | null;
  userId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

interface PageRenderState {
  rendered: boolean;
  rendering: boolean;
}

export function PDFViewer({
  visible,
  pdf,
  userId,
  onClose,
  onUpdate,
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState(pdf?.annotations || []);
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width - 32);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isPDFJSReady, setIsPDFJSReady] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageRenders, setPageRenders] = useState<Map<number, PageRenderState>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const pdfViewerRef = useRef<View>(null);
  const pageRefs = useRef<Map<number, { canvas: HTMLCanvasElement | null; textLayer: HTMLDivElement | null }>>(new Map());
  const refreshHandlerRef = useRef<(() => void) | null>(null);

  // Listen for PDF.js loading completion
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handler = () => {
      console.log('✅ PDF.js loaded event received');
      setIsPDFJSReady(true);
    };
    
    window.addEventListener('pdfjs-loaded', handler);
    
    // Check if PDF.js is already loaded
    if (pdfjsAvailable && pdfjsLib) {
      setIsPDFJSReady(true);
    }
    
    return () => window.removeEventListener('pdfjs-loaded', handler);
  }, []);

  // Debug selected text changes
  useEffect(() => {
    console.log('📄 PDFViewer - selectedText state changed:', {
      hasText: !!selectedText,
      length: selectedText?.length || 0,
      preview: selectedText?.substring(0, 50) || '',
    });
  }, [selectedText]);

  useEffect(() => {
    if (pdf && visible) {
      setAnnotations(pdf.annotations || []);
      setCurrentPage(1);
      setActiveTab('summary');
      setSelectedText('');
      setLoadError(null);
      loadPDF();
    }
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setPageWidth(window.width - 32);
    });
    
    return () => subscription?.remove();
  }, [pdf, visible]);

  // Scroll to current page when it changes
  useEffect(() => {
    if (scrollViewRef.current && numPages && currentPage > 0) {
      const offsetX = (currentPage - 1) * pageWidth;
      scrollViewRef.current.scrollTo({ x: offsetX, animated: true });
    }
  }, [currentPage, pageWidth, numPages]);

  // Detect text selection from PDF text layers
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !isPDFJSReady) return;

    const handleMouseUp = () => {
      try {
        const selection = window.getSelection();
        if (!selection) return;

        const text = selection.toString().trim();
        if (text && text.length > 2) {
          // Check if selection is within PDF text layer
          const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          if (range) {
            // Check if selection is inside a .pdf-text-layer element
            let element: Node | null = range.commonAncestorContainer;
            
            // Walk up the DOM tree to find .pdf-text-layer
            while (element && element.nodeType !== Node.ELEMENT_NODE) {
              element = element.parentNode;
            }
            
            let currentElement = element as Element | null;
            while (currentElement) {
              if (currentElement.classList && currentElement.classList.contains('pdf-text-layer')) {
                console.log('PDF text selected:', text.substring(0, 50));
                setSelectedText(text);
                return;
              }
              currentElement = currentElement.parentElement;
            }
          }
        }
      } catch (err) {
        console.log('Selection error:', err);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [visible, isPDFJSReady]);

  const loadPDF = async () => {
    if (!pdf) return;
    
    setIsLoadingPDF(true);
    setLoadError(null);
    
    try {
      // Fetch the download URL
      console.log('Fetching PDF download URL...');
      const url = await getPDFDownloadUrl(pdf.id, userId);
      
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        throw new Error('Invalid PDF URL - must be a valid HTTP/HTTPS URL');
      }
      
      console.log('PDF URL:', url);
      setPdfUrl(url);
      
      // On mobile, use WebView to display PDF inside the app
      if (Platform.OS !== 'web') {
        setIsLoadingPDF(false);
        return;
      }
      
      // Load PDF.js for web
      if (Platform.OS === 'web') {
        const loaded = await loadPDFJS();
        if (!loaded || !pdfjsLib) {
          throw new Error('Failed to load PDF.js library');
        }
        setIsPDFJSReady(true);
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', doc.numPages);
        setPdfDocument(doc);
        setNumPages(doc.numPages);
        setIsLoadingPDF(false);
      }
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setLoadError(error.message || 'Failed to load PDF');
      setIsLoadingPDF(false);
    }
  };

  // Render a single page to canvas
  const renderPage = async (pageNum: number) => {
    if (!pdfDocument || !pdfjsLib || Platform.OS !== 'web') return;
    
    const pageRef = pageRefs.current.get(pageNum);
    if (!pageRef || !pageRef.canvas || !pageRef.textLayer) return;
    
    const renderState = pageRenders.get(pageNum);
    
    // Skip if already rendering
    if (renderState?.rendering) return;
    
    // Check if canvas is blank (needs rendering even if marked as rendered)
    const canvas = pageRef.canvas;
    const isCanvasBlank = canvas.width === 0 || canvas.height === 0;
    
    // Skip if already rendered AND canvas has content
    if (renderState?.rendered && !isCanvasBlank) {
      // Double-check canvas actually has pixels (in case it was cleared)
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 1), Math.min(canvas.height, 1));
          const hasPixels = imageData.data.some((pixel, index) => index % 4 !== 3 && pixel !== 0);
          if (hasPixels) {
            return; // Canvas has content, skip rendering
          }
        }
      } catch (e) {
        // If check fails, proceed with rendering
      }
    }
    
    try {
      setPageRenders(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(pageNum);
        if (state?.rendering || state?.rendered) {
          return prev; // No change needed
        }
        newMap.set(pageNum, { rendered: false, rendering: true });
        return newMap;
      });
      
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      
      // Calculate scale to fit width
      const scale = (pageWidth - 32) / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      
      const canvas = pageRef.canvas;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // Only update dimensions if they've changed (to avoid clearing canvas)
      const newWidth = scaledViewport.width;
      const newHeight = scaledViewport.height;
      const needsResize = canvas.width !== newWidth || canvas.height !== newHeight;
      
      if (needsResize) {
        // Save current content if canvas has been rendered before
        const hasContent = canvas.width > 0 && canvas.height > 0;
        let imageData: ImageData | null = null;
        
        if (hasContent) {
          try {
            imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          } catch (e) {
            // If getImageData fails, we'll just re-render
            imageData = null;
          }
        }
        
        // Set new dimensions (this clears the canvas)
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Restore content if we had it (though we'll re-render anyway)
        // This is mainly to prevent flicker during resize
      }
      
      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      
      await page.render(renderContext).promise;
      
      // Render text layer using official PDF.js textLayer builder
      const textContent = await page.getTextContent();
      const textLayerDiv = pageRef.textLayer;
      
      // Clear and prepare text layer
      textLayerDiv.innerHTML = '';
      textLayerDiv.className = 'pdf-text-layer';
      textLayerDiv.style.transform = 'none';
      textLayerDiv.style.left = '0px';
      textLayerDiv.style.top = '0px';
      
      // Set CSS variable for scale-factor (required by PDF.js)
      textLayerDiv.style.setProperty('--scale-factor', scale.toString());
      
      // Use official PDF.js textLayer builder with ORIGINAL viewport (scale=1)
      // PDF.js 3.10.111+ uses textContentSource instead of textContent (deprecated)
      if (pdfjsLib.renderTextLayer) {
        // Use new API with textContentSource
        pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport, // Use original viewport at scale=1, NOT scaledViewport
          textDivs: []
        });
      } else if (pdfjsLib.TextLayerBuilder) {
        // Alternative: use TextLayerBuilder class if available
        const textLayerBuilder = new pdfjsLib.TextLayerBuilder({
          textLayerDiv: textLayerDiv,
          pageIndex: pageNum - 1,
          viewport, // Use original viewport at scale=1
        });
        textLayerBuilder.setTextContent(textContent);
        textLayerBuilder.render();
      } else {
        console.error('PDF.js textLayer API not found');
        return;
      }
      
      // Manually scale text layer using CSS width/height only (NO transform)
      textLayerDiv.style.width = `${scaledViewport.width}px`;
      textLayerDiv.style.height = `${scaledViewport.height}px`;
      
      setPageRenders(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(pageNum);
        if (state?.rendered) {
          return prev; // Already rendered, no change needed
        }
        newMap.set(pageNum, { rendered: true, rendering: false });
        return newMap;
      });
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error);
      setPageRenders(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(pageNum);
        if (state && !state.rendering) {
          return prev; // Already not rendering, no change needed
        }
        newMap.set(pageNum, { rendered: false, rendering: false });
        return newMap;
      });
    }
  };

  // Preload pages around current page
  useEffect(() => {
    if (!numPages || !pdfDocument || Platform.OS !== 'web') return;
    
    const preloadRange = 2; // Preload 2 pages ahead and behind
    const pagesToLoad: number[] = [];
    
    for (let i = Math.max(1, currentPage - preloadRange); i <= Math.min(numPages, currentPage + preloadRange); i++) {
      pagesToLoad.push(i);
    }
    
    pagesToLoad.forEach(pageNum => {
      const renderState = pageRenders.get(pageNum);
      const pageRef = pageRefs.current.get(pageNum);
      const canvas = pageRef?.canvas;
      
      // Check if page needs rendering (not rendered, or rendered but canvas is blank)
      const needsRender = !renderState?.rendering && 
        (!renderState?.rendered || !canvas || canvas.width === 0 || canvas.height === 0);
      
      if (needsRender && pageRef?.canvas && pageRef?.textLayer) {
        renderPage(pageNum);
      }
    });
  }, [currentPage, numPages, pdfDocument, pageWidth]);

  // Watch for blank canvases after analysis completes and re-render them
  useEffect(() => {
    if (!numPages || !pdfDocument || Platform.OS !== 'web' || !visible) return;
    
    // Small delay to check after any re-renders settle
    const timeoutId = setTimeout(() => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const renderState = pageRenders.get(pageNum);
        const pageRef = pageRefs.current.get(pageNum);
        
        if (renderState?.rendered && pageRef?.canvas && pageRef?.textLayer) {
          const canvas = pageRef.canvas;
          // If canvas dimensions are 0, it's blank and needs re-rendering
          if (canvas.width === 0 || canvas.height === 0) {
            console.log(`Detected blank canvas for page ${pageNum}, re-rendering...`);
            // Reset render state and re-render
            setPageRenders(prev => {
              const newMap = new Map(prev);
              newMap.set(pageNum, { rendered: false, rendering: false });
              return newMap;
            });
            requestAnimationFrame(() => {
              renderPage(pageNum);
            });
          }
        }
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedPage, numPages, pdfDocument, visible]); // Trigger when selectedPage changes (after analysis)

  const handleOpenPDF = async () => {
    if (!pdf || !pdfUrl) return;

    setIsLoading(true);
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Cannot open PDF URL');
      }
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', error.message || 'Failed to open PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnnotations = async () => {
    if (!pdf) return;

    setIsLoading(true);
    try {
      await updatePDFAnnotations(pdf.id, userId, annotations);
      Alert.alert('Success', 'Annotations saved successfully');
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      Alert.alert('Error', error.message || 'Failed to save annotations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Capture screenshot of current PDF page
  const handleCaptureScreenshot = async (): Promise<string | null> => {
    if (Platform.OS !== 'web' || !currentPage) {
      return null;
    }

    try {
      const pageRef = pageRefs.current.get(currentPage);
      if (!pageRef || !pageRef.canvas) {
        console.warn('Canvas not found for current page');
        return null;
      }

      const canvas = pageRef.canvas;
      
      // Convert canvas to base64 image
      const imageData = canvas.toDataURL('image/png');
      return imageData;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };

  // Setup page refs when component mounts/updates
  useEffect(() => {
    if (Platform.OS !== 'web' || !numPages) return;
    
    // Initialize refs and render state for all pages
    for (let i = 1; i <= numPages; i++) {
      if (!pageRefs.current.has(i)) {
        pageRefs.current.set(i, { canvas: null, textLayer: null });
      }
      setPageRenders(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(i)) {
          newMap.set(i, { rendered: false, rendering: false });
        }
        return newMap;
      });
    }
  }, [numPages]);

  const renderPDFViewer = () => {
    if (isLoadingPDF) {
      return (
        <View style={styles.pdfLoadingContainer}>
          <Skeleton width={200} height={280} borderRadius={8} style={{ marginBottom: 16 }} />
          <SkeletonText lines={2} width="60%" />
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.pdfLoadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.pdfLoadingText}>Failed to load PDF</Text>
          <Text style={[styles.pdfLoadingText, { fontSize: 12, marginTop: 8 }]}>{loadError}</Text>
        </View>
      );
    }

    // On mobile, use WebView to display PDF
    if (Platform.OS !== 'web') {
      if (!pdfUrl) {
        return (
          <View style={styles.pdfLoadingContainer}>
            <Ionicons name="document-text" size={48} color="#9ca3af" />
            <Text style={styles.pdfLoadingText}>PDF not available</Text>
          </View>
        );
      }
      
      const screenHeight = Dimensions.get('window').height;
      const mobilePreviewHeight = screenHeight * 0.29; // Match web preview height
      
      return (
        <View style={[styles.webViewContainer, { height: mobilePreviewHeight }]}>
          <WebView
            source={{ uri: pdfUrl }}
            style={styles.webView}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#6B7C32" />
                <Text style={styles.webViewLoadingText}>Loading PDF...</Text>
              </View>
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setLoadError('Failed to load PDF in viewer');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
              setLoadError(`HTTP Error: ${nativeEvent.statusCode}`);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scalesPageToFit={true}
          />
          {/* Page Indicator for Mobile */}
          {pdf && (
            <View style={styles.mobilePageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {pdf.pages ? `1 / ${pdf.pages}` : 'PDF'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (!pdfUrl || !isPDFJSReady) {
      return (
        <View style={styles.pdfLoadingContainer}>
          <Ionicons name="document-text" size={48} color="#9ca3af" />
          <Text style={styles.pdfLoadingText}>PDF not available</Text>
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <View ref={pdfViewerRef} style={styles.pdfViewerContainer} data-pdf-viewer={true}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pdfScrollContainer}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const page = Math.round(offsetX / pageWidth) + 1;
              if (page >= 1 && page <= (numPages || 1)) {
                setCurrentPage(page);
              }
            }}
            onScroll={(event) => {
              // Render pages on demand when scrolling
              const offsetX = event.nativeEvent.contentOffset.x;
              const visiblePage = Math.round(offsetX / pageWidth) + 1;
              if (visiblePage >= 1 && visiblePage <= (numPages || 1)) {
                // Render visible page and nearby pages
                for (let i = Math.max(1, visiblePage - 1); i <= Math.min(numPages || 1, visiblePage + 1); i++) {
                  const renderState = pageRenders.get(i);
                  if (!renderState?.rendered && !renderState?.rendering) {
                    renderPage(i);
                  }
                }
              }
            }}
          >
            {numPages ? Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
              const renderState = pageRenders.get(pageNum);
              
              // Ensure pageRef exists
              if (!pageRefs.current.has(pageNum)) {
                pageRefs.current.set(pageNum, { canvas: null, textLayer: null });
              }
              
              return (
                <TouchableOpacity
                  key={pageNum}
                  style={[
                    styles.pdfPageWrapper,
                    { width: pageWidth },
                    selectedPage === pageNum && styles.pdfPageSelected
                  ]}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Toggle selection: if already selected, unselect; otherwise select
                    if (selectedPage === pageNum) {
                      setSelectedPage(null);
                    } else {
                      setSelectedPage(pageNum);
                      setCurrentPage(pageNum);
                    }
                  }}
                >
                  <View style={[styles.pdfPageContainer, { width: pageWidth - 32 }]}>
                    {/* Canvas for PDF rendering */}
                    {Platform.OS === 'web' && (
                      <>
                        <canvas
                          ref={(el) => {
                            if (!el) return;
                            
                            const pageRef = pageRefs.current.get(pageNum);
                            // Only update if ref changed
                            if (pageRef?.canvas === el) return;
                            
                            // Update ref only (no state update - refs don't trigger re-renders)
                            if (pageRef) {
                              pageRef.canvas = el;
                            } else {
                              pageRefs.current.set(pageNum, { canvas: el, textLayer: null });
                            }
                            
                            // Trigger render if document is ready and both refs are set
                            if (pdfDocument) {
                              const checkRef = pageRefs.current.get(pageNum);
                              const renderState = pageRenders.get(pageNum);
                              if (checkRef?.canvas && checkRef?.textLayer && 
                                  renderState && !renderState.rendered && !renderState.rendering) {
                                // Use requestAnimationFrame to avoid calling during render
                                requestAnimationFrame(() => {
                                  renderPage(pageNum);
                                });
                              }
                            }
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 'auto',
                          }}
                        />
                        {/* Text layer for selectable text */}
                        <div
                          ref={(el) => {
                            if (!el) return;
                            
                            const pageRef = pageRefs.current.get(pageNum);
                            // Only update if ref changed
                            if (pageRef?.textLayer === el) return;
                            
                            // Update ref only (no state update - refs don't trigger re-renders)
                            if (pageRef) {
                              pageRef.textLayer = el;
                            } else {
                              pageRefs.current.set(pageNum, { canvas: null, textLayer: el });
                            }
                            
                            // Trigger render if document is ready and both refs are set
                            if (pdfDocument) {
                              const checkRef = pageRefs.current.get(pageNum);
                              const renderState = pageRenders.get(pageNum);
                              if (checkRef?.canvas && checkRef?.textLayer && 
                                  renderState && !renderState.rendered && !renderState.rendering) {
                                // Use requestAnimationFrame to avoid calling during render
                                requestAnimationFrame(() => {
                                  renderPage(pageNum);
                                });
                              }
                            }
                          }}
                          className="pdf-text-layer"
                        />
                      </>
                    )}
                    {renderState?.rendering && (
                      <View style={styles.pageRenderingIndicator}>
                        <ActivityIndicator size="small" color="#6B7C32" />
                      </View>
                    )}
                  </View>
                  {selectedPage === pageNum ? (
                    <View style={styles.pageSelectionIndicator}>
                      <Ionicons name="checkmark-circle" size={24} color="#6B7C32" />
                      <Text style={styles.pageSelectionText}>Selected</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }) : null}
          </ScrollView>
          
          {/* Floating Navigation Buttons */}
          {numPages && numPages > 1 ? (
            <>
              {/* Left Arrow - Floating */}
              <TouchableOpacity
                onPress={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  setCurrentPage(newPage);
                }}
                disabled={currentPage === 1}
                style={[
                  styles.floatingNavButton,
                  styles.floatingNavButtonLeft,
                  currentPage === 1 && styles.floatingNavButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentPage === 1 ? "#9ca3af" : "#6B7C32"} 
                />
              </TouchableOpacity>
              
              {/* Right Arrow - Floating */}
              <TouchableOpacity
                onPress={() => {
                  const newPage = Math.min(numPages, currentPage + 1);
                  setCurrentPage(newPage);
                }}
                disabled={currentPage === numPages}
                style={[
                  styles.floatingNavButton,
                  styles.floatingNavButtonRight,
                  currentPage === numPages && styles.floatingNavButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={currentPage === numPages ? "#9ca3af" : "#6B7C32"} 
                />
              </TouchableOpacity>
              
              {/* Page Indicator - Compact Caption */}
              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>
                  {currentPage} / {numPages}
                </Text>
                {pdf && pdf.pages && pdf.pages !== numPages && (
                  <Text style={styles.pageCountMismatch}>
                    (Backend: {pdf.pages})
                  </Text>
                )}
              </View>
            </>
          ) : null}
        </View>
      );
    }
    
    // Fallback for native platforms
    return (
      <View style={styles.pdfPlaceholder}>
        <Ionicons name="document-text" size={48} color="#9ca3af" />
        <Text style={styles.pdfPlaceholderText}>PDF Preview</Text>
        <Text style={styles.pdfPlaceholderSubtext}>
          PDF preview available on web
        </Text>
        <TouchableOpacity
          style={styles.openButton}
          onPress={handleOpenPDF}
          disabled={isLoading}
        >
          <Ionicons name="open-outline" size={20} color="#6B7C32" />
          <Text style={styles.openButtonText}>Open PDF</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <View style={styles.tabContent}>
            {pdf && (
              <PDFAnalysisPanel
                pdf={pdf}
                userId={userId}
                selectedPage={selectedPage}
                onPageSelect={setSelectedPage}
                onAnalysisComplete={onUpdate}
                onRefreshRequest={(handler) => {
                  refreshHandlerRef.current = handler;
                }}
              />
            )}
          </View>
        );
      case 'chat':
        return (
          <View style={styles.tabContent}>
            {pdf && (
              <PDFChatPanel
                pdf={pdf}
                userId={userId}
                selectedText={selectedText}
                onSelectedTextClear={() => setSelectedText('')}
                onCaptureScreenshot={handleCaptureScreenshot}
                currentPage={currentPage}
              />
            )}
          </View>
        );
      default:
        return null;
    }
  };

  if (!pdf) return null;

  const handleRequestClose = useCallback(() => {
    // Handle back button/escape - just close modal, don't navigate
    // This is called by Modal's onRequestClose (Android back button, web escape)
    // We just close the modal without triggering navigation
    onClose();
  }, [onClose]);

  // Prevent navigation when modal is open
  useEffect(() => {
    if (!visible) return;

    // Handle Android back button
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose(); // Call onClose directly, not handleRequestClose
        return true; // Prevent default back behavior and navigation
      });

      return () => backHandler.remove();
    }

    // Handle web browser Escape key (back button handled by Modal's onRequestClose)
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Handle Escape key
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose(); // Call onClose directly
        }
      };

      window.addEventListener('keydown', handleKeyDown, true);

      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [visible, onClose]);

  const screenHeight = Dimensions.get('window').height;
  const previewHeight = screenHeight * 0.29; // 29% of screen height - more compact

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleRequestClose}
      presentationStyle="fullScreen"
      hardwareAccelerated={true}
    >
      <View style={styles.container}>
        {/* Sticky Header */}
        <View style={styles.header}>
          {/* Top Row: Back | Title | External Link */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {pdf.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenPDF}
              disabled={isLoading}
              style={styles.externalLinkButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#6B7C32" />
              ) : (
                <Ionicons name="open-outline" size={24} color="#6B7C32" />
              )}
            </TouchableOpacity>
          </View>
          {/* Sub-row: Page count info */}
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>
              {pdf.pages} pages • {formatFileSize(pdf.size)}
            </Text>
          </View>
        </View>

        {/* PDF Preview Section - Fixed */}
        <View style={[styles.pdfSection, { minHeight: previewHeight }]}>
          {renderPDFViewer()}
        </View>

        {/* Tabs - Sticky */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
              onPress={() => setActiveTab('summary')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
                Summary
              </Text>
              {activeTab === 'summary' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
              onPress={() => setActiveTab('chat')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
                Chat
              </Text>
              {activeTab === 'chat' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>
          {/* Refresh Button - Right aligned when Summary tab is active */}
          {activeTab === 'summary' && pdf?.analysis && (
            <TouchableOpacity
              style={styles.tabRefreshButton}
              onPress={() => {
                // Trigger re-analysis via ref handler
                if (refreshHandlerRef.current) {
                  refreshHandlerRef.current();
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#6B7C32" />
            </TouchableOpacity>
          )}
        </View>

        {/* Scrollable Tab Content */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderTabContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  externalLinkButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerSubRow: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  pdfSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabContent: {
    paddingHorizontal: 0,
  },
  tabContentContainer: {
    padding: 16,
  },
  pdfViewerContainer: {
    height: '100%',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    position: 'relative',
  },
  pdfScrollContainer: {
    flexDirection: 'row',
  },
  pdfPageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  pdfPageContainer: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  floatingNavButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 5,
  },
  floatingNavButtonLeft: {
    left: 16,
    transform: [{ translateY: -22 }],
  },
  floatingNavButtonRight: {
    right: 16,
    transform: [{ translateY: -22 }],
  },
  floatingNavButtonDisabled: {
    opacity: 0.4,
  },
  pageIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  pageRenderingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  pdfPageSelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#6B7C32',
    borderRadius: 8,
  },
  pageSelectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageSelectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C32',
  },
  pdfLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  webViewContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  webViewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  mobilePageIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 4,
  },
  pageCountMismatch: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 2,
  },
  pdfPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  pdfPlaceholderText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  pdfPlaceholderSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  openButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B7C32',
    gap: 8,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7C32',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  tabRefreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E3E3E3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    paddingBottom: 12,
    paddingTop: 12,
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#6B7C32',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6B7C32',
  },
});
