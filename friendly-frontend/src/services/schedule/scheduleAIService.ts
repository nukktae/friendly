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

  public static getInstance(): ScheduleAIService {
    if (!ScheduleAIService.instance) {
      ScheduleAIService.instance = new ScheduleAIService();
    }
    return ScheduleAIService.instance;
  }

  /**
   * Mock AI analysis of schedule image
   * Simulates 2-3 second processing time
   * Uses mock data based on the calendar schedule image
   */
  async analyzeScheduleImage(imageUri: string): Promise<ScheduleItem[]> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Mock schedule data based on the calendar image (Monday 15 - Thursday 18)
    const mockSchedules: ScheduleItem[] = [
      // Monday 15
      {
        id: '1',
        title: '소셜마케팅캠페인 (Social Marketing Campaign)',
        time: '1:30 PM - 4:30 PM',
        day: 'Monday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.92,
        startTime: '13:30',
        endTime: '16:30'
      },
      {
        id: '2',
        title: '이산수학 (Discrete Mathematics)',
        time: '4:30 PM - 6:00 PM',
        day: 'Monday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.90,
        startTime: '16:30',
        endTime: '18:00'
      },
      // Tuesday 16
      {
        id: '3',
        title: '알고리즘 (Algorithm)',
        time: '10:30 AM - 12:00 PM',
        day: 'Tuesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.93,
        startTime: '10:30',
        endTime: '12:00'
      },
      {
        id: '4',
        title: '컴퓨터구조 (Computer Architecture)',
        time: '12:00 PM - 1:30 PM',
        day: 'Tuesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.91,
        startTime: '12:00',
        endTime: '13:30'
      },
      {
        id: '5',
        title: 'Public Speaking: Science Communication',
        time: '3:00 PM - 4:30 PM',
        day: 'Tuesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.89,
        startTime: '15:00',
        endTime: '16:30'
      },
      {
        id: '6',
        title: '모바일프로그래밍 (Mobile Programming)',
        time: '4:30 PM - 6:00 PM',
        day: 'Tuesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.92,
        startTime: '16:30',
        endTime: '18:00'
      },
      {
        id: '7',
        title: '사제동행세미나 (Faculty-Student Seminar)',
        time: '6:00 PM',
        day: 'Tuesday',
        location: 'Room TBD',
        type: 'meeting',
        confidence: 0.85,
        startTime: '18:00',
        endTime: '19:00'
      },
      // Wednesday 17
      {
        id: '8',
        title: '소통과토론 (Communication and Discussion)',
        time: '1:30 PM - 4:30 PM',
        day: 'Wednesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.88,
        startTime: '13:30',
        endTime: '16:30'
      },
      {
        id: '9',
        title: '이산수학 (Discrete Mathematics)',
        time: '4:30 PM - 6:00 PM',
        day: 'Wednesday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.90,
        startTime: '16:30',
        endTime: '18:00'
      },
      // Thursday 18
      {
        id: '10',
        title: '알고리즘 (Algorithm)',
        time: '10:30 AM - 12:00 PM',
        day: 'Thursday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.93,
        startTime: '10:30',
        endTime: '12:00'
      },
      {
        id: '11',
        title: '컴퓨터구조 (Computer Architecture)',
        time: '12:00 PM - 1:30 PM',
        day: 'Thursday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.91,
        startTime: '12:00',
        endTime: '13:30'
      },
      {
        id: '12',
        title: 'Public Speaking: Science Communication',
        time: '3:00 PM - 4:30 PM',
        day: 'Thursday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.89,
        startTime: '15:00',
        endTime: '16:30'
      },
      {
        id: '13',
        title: '모바일프로그래밍 (Mobile Programming)',
        time: '4:30 PM - 6:00 PM',
        day: 'Thursday',
        location: 'Room TBD',
        type: 'class',
        confidence: 0.92,
        startTime: '16:30',
        endTime: '18:00'
      }
    ];

    // Add some randomness to make it feel more realistic
    return mockSchedules.map(item => ({
      ...item,
      confidence: Math.max(0.75, item.confidence - Math.random() * 0.1)
    }));
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
