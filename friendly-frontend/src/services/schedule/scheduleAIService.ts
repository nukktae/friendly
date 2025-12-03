import { ENV } from '../../config/env';
import { Platform } from 'react-native';

export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  day: string;
  location?: string;
  instructor?: string;
  type: 'class' | 'assignment' | 'exam' | 'meeting' | 'other';
  confidence: number; // 0-1 confidence score
  startTime?: string; // ISO time string
  endTime?: string; // ISO time string
}

export interface CorrectionCommand {
  type: 'change' | 'move' | 'delete' | 'add';
  field?: 'title' | 'time' | 'location' | 'day';
  value?: string;
  itemId?: string;
  originalText?: string;
}

export class ScheduleAIService {
  private static instance: ScheduleAIService;
  private readonly API_BASE = ENV.API_BASE;

  public static getInstance(): ScheduleAIService {
    if (!ScheduleAIService.instance) {
      ScheduleAIService.instance = new ScheduleAIService();
    }
    return ScheduleAIService.instance;
  }

  /**
   * Analyze schedule image using backend API
   * Calls the /api/schedule/:userId/analyze-image endpoint
   * Returns both schedule items and the scheduleId
   */
  async analyzeScheduleImage(imageUri: string, userId: string): Promise<{ items: ScheduleItem[]; scheduleId: string }> {
    try {
      const formData = new FormData();
      
      // Extract filename from URI
      let filename = imageUri.split('/').pop() || `schedule_${Date.now()}.jpg`;
      filename = filename.split('?')[0];
      
      // Determine file extension and MIME type
      const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeTypeMap: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      const type = mimeTypeMap[extension] || 'image/jpeg';
      
      if (!filename.includes('.')) {
        filename = `${filename}.${extension}`;
      }

      // Handle web vs native platforms differently
      if (Platform.OS === 'web') {
        // Web platform - use File API
        try {
          const response = await fetch(imageUri);
          if (response.ok && typeof response.blob === 'function') {
            const blob = await response.blob();
            const file = new File([blob], filename, { type });
            formData.append('image', file);
          } else {
            // Fallback: use URI directly if blob() is not available
            formData.append('image', imageUri as any);
          }
        } catch (error) {
          console.error('Error converting image to blob:', error);
          // Fallback: use URI directly
          formData.append('image', imageUri as any);
        }
      } else {
        // React Native platform - use FormData with uri, type, name
        const fileData: any = {
          uri: imageUri,
          type: type,
          name: filename,
        };
        formData.append('image', fileData);
      }

      // Add userId as form field
      formData.append('userId', userId);

      console.log('Calling analyze-image API for userId:', userId);

      const response = await fetch(`${this.API_BASE}/api/schedule/${userId}/analyze-image`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let fetch set it automatically with boundary
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to analyze image' }));
        throw new Error(error.error || `Failed to analyze image: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Image analysis failed');
      }

      // Convert API response format to ScheduleItem format
      const scheduleItems: ScheduleItem[] = data.items.map((item: any, index: number) => ({
        id: `item_${data.scheduleId}_${index}`,
        title: item.name || '',
        time: item.time || '',
        day: item.day || '',
        location: item.place || undefined,
        type: 'class' as const,
        confidence: 0.9, // API doesn't return confidence, use default
        startTime: this.parseTime(item.time),
        endTime: undefined, // API doesn't return end time separately
      }));

      // Return both items and scheduleId
      return {
        items: scheduleItems,
        scheduleId: data.scheduleId,
      };
    } catch (error: any) {
      console.error('Error analyzing schedule image:', error);
      throw error;
    }
  }

  /**
   * Confirm schedule and create lectures
   * Calls the /api/schedule/schedule/:scheduleId/confirm endpoint
   */
  async confirmSchedule(scheduleId: string, userId: string): Promise<{
    success: boolean;
    scheduleId: string;
    userId: string;
    lecturesCreated: Array<{
      lectureId: string;
      title: string;
      day: string;
      place: string | null;
      time: string;
    }>;
    count: number;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/api/schedule/schedule/${scheduleId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to confirm schedule' }));
        throw new Error(error.error || `Failed to confirm schedule: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error confirming schedule:', error);
      throw error;
    }
  }

  /**
   * Parse time string to extract start time
   */
  private parseTime(timeString: string): string | undefined {
    if (!timeString) return undefined;
    // Try to extract time from strings like "3:00 PM" or "11:00 AM"
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return undefined;
  }


  /**
   * Parse voice/text correction commands
   */
  parseCorrectionCommand(text: string): CorrectionCommand | null {
    const lowerText = text.toLowerCase().trim();

    // Pattern matching for common correction commands
    const patterns = [
      // Change commands
      { regex: /change (.+) to (.+)/i, type: 'change' as const },
      { regex: /update (.+) to (.+)/i, type: 'change' as const },
      { regex: /edit (.+) to (.+)/i, type: 'change' as const },
      
      // Move commands
      { regex: /move (.+) to (.+)/i, type: 'move' as const },
      { regex: /reschedule (.+) to (.+)/i, type: 'move' as const },
      
      // Delete commands
      { regex: /delete (.+)/i, type: 'delete' as const },
      { regex: /remove (.+)/i, type: 'delete' as const },
      
      // Add commands
      { regex: /add (.+) at (.+)/i, type: 'add' as const },
      { regex: /create (.+) at (.+)/i, type: 'add' as const }
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern.regex);
      if (match) {
        return {
          type: pattern.type,
          originalText: text,
          value: match[2] || match[1],
          field: this.extractField(match[1])
        };
      }
    }

    return null;
  }

  /**
   * Extract field type from command text
   */
  private extractField(text: string): 'title' | 'time' | 'location' | 'day' | undefined {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('time') || lowerText.includes('hour') || lowerText.includes('am') || lowerText.includes('pm')) {
      return 'time';
    }
    if (lowerText.includes('location') || lowerText.includes('room') || lowerText.includes('place')) {
      return 'location';
    }
    if (lowerText.includes('day') || lowerText.includes('monday') || lowerText.includes('tuesday') || 
        lowerText.includes('wednesday') || lowerText.includes('thursday') || lowerText.includes('friday')) {
      return 'day';
    }
    if (lowerText.includes('title') || lowerText.includes('name') || lowerText.includes('class')) {
      return 'title';
    }
    
    return undefined;
  }

  /**
   * Apply correction to schedule items
   */
  applyCorrection(items: ScheduleItem[], command: CorrectionCommand): ScheduleItem[] {
    if (!command.itemId) {
      // Apply to first matching item or create new item
      return this.applyCorrectionToItems(items, command);
    }

    return items.map(item => {
      if (item.id === command.itemId) {
        return this.applyCorrectionToItem(item, command);
      }
      return item;
    });
  }

  private applyCorrectionToItems(items: ScheduleItem[], command: CorrectionCommand): ScheduleItem[] {
    switch (command.type) {
      case 'add':
        const newItem: ScheduleItem = {
          id: Date.now().toString(),
          title: command.value || 'New Event',
          time: command.value || '9:00 AM - 10:00 AM',
          day: 'Monday',
          type: 'other',
          confidence: 0.8
        };
        return [...items, newItem];

      case 'delete':
        // Remove first item that matches the description
        return items.filter(item => 
          !item.title.toLowerCase().includes(command.value?.toLowerCase() || '')
        );

      default:
        return items;
    }
  }

  private applyCorrectionToItem(item: ScheduleItem, command: CorrectionCommand): ScheduleItem {
    switch (command.type) {
      case 'change':
        if (command.field === 'title') {
          return { ...item, title: command.value || item.title };
        }
        if (command.field === 'time') {
          return { ...item, time: command.value || item.time };
        }
        if (command.field === 'location') {
          return { ...item, location: command.value || item.location };
        }
        if (command.field === 'day') {
          return { ...item, day: command.value || item.day };
        }
        break;

      case 'move':
        // Move typically affects time or day
        if (command.field === 'time') {
          return { ...item, time: command.value || item.time };
        }
        if (command.field === 'day') {
          return { ...item, day: command.value || item.day };
        }
        break;

      case 'delete':
        // This would be handled at the parent level
        return item;
    }

    return item;
  }

  /**
   * Re-analyze schedule with corrections
   */
  async reanalyzeWithCorrections(
    originalItems: ScheduleItem[], 
    corrections: CorrectionCommand[]
  ): Promise<ScheduleItem[]> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let updatedItems = [...originalItems];

    // Apply all corrections
    for (const correction of corrections) {
      updatedItems = this.applyCorrection(updatedItems, correction);
    }

    // Increase confidence scores after corrections
    return updatedItems.map(item => ({
      ...item,
      confidence: Math.min(0.95, item.confidence + 0.1)
    }));
  }

  /**
   * Validate schedule for conflicts
   */
  validateSchedule(items: ScheduleItem[]): { hasConflicts: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    const timeSlots: { [key: string]: ScheduleItem[] } = {};

    // Group items by day
    items.forEach(item => {
      if (!timeSlots[item.day]) {
        timeSlots[item.day] = [];
      }
      timeSlots[item.day].push(item);
    });

    // Check for time conflicts
    Object.keys(timeSlots).forEach(day => {
      const dayItems = timeSlots[day];
      dayItems.forEach((item, index) => {
        dayItems.slice(index + 1).forEach(otherItem => {
          if (this.hasTimeConflict(item, otherItem)) {
            conflicts.push(`${item.title} conflicts with ${otherItem.title} on ${day}`);
          }
        });
      });
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  private hasTimeConflict(item1: ScheduleItem, item2: ScheduleItem): boolean {
    // Simple time conflict detection
    // In a real implementation, this would parse time strings properly
    const time1 = item1.startTime || item1.time.split(' - ')[0];
    const time2 = item2.startTime || item2.time.split(' - ')[0];
    
    // Mock conflict detection - items with same start time conflict
    return time1 === time2;
  }
}

export default ScheduleAIService.getInstance();
