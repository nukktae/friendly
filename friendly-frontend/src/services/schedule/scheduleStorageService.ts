import { getStorageAdapter } from '@/src/lib/storage';
import { Timestamp } from 'firebase/firestore';
import { CalendarSyncSettings } from '../calendar/googleCalendarService';
import { ScheduleItem } from './scheduleAIService';

export interface UserSchedule {
  id: string;
  userId: string;
  title: string;
  description?: string;
  items: ScheduleItem[];
  syncSettings?: CalendarSyncSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export interface ScheduleStorageOptions {
  enableOfflineCache: boolean;
  enableRealTimeSync: boolean;
  cacheExpirationHours: number;
}

export class ScheduleStorageService {
  private static instance: ScheduleStorageService;
  private readonly COLLECTION_NAME = 'userSchedules';
  private readonly CACHE_KEY_PREFIX = 'schedule_cache_';
  private readonly CACHE_EXPIRATION_KEY = 'schedule_cache_expiration';
  
  private options: ScheduleStorageOptions = {
    enableOfflineCache: true,
    enableRealTimeSync: true,
    cacheExpirationHours: 24
  };

  public static getInstance(): ScheduleStorageService {
    if (!ScheduleStorageService.instance) {
      ScheduleStorageService.instance = new ScheduleStorageService();
    }
    return ScheduleStorageService.instance;
  }

  /**
   * Configure storage options
   */
  configure(options: Partial<ScheduleStorageOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Save schedule locally (frontend-only)
   */
  async saveSchedule(
    userId: string, 
    schedule: Omit<UserSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const scheduleId = `schedule_${Date.now()}`;
    const now = Timestamp.now();
    
    const scheduleData: UserSchedule = {
      id: scheduleId,
      userId,
      title: schedule.title,
      description: schedule.description,
      items: schedule.items,
      syncSettings: schedule.syncSettings,
      createdAt: now,
      updatedAt: now,
      isActive: schedule.isActive !== false
    };

    // Save locally only
    const cacheableSchedule = {
      ...scheduleData,
      createdAt: { _seconds: now.seconds, _nanoseconds: now.nanoseconds } as any,
      updatedAt: { _seconds: now.seconds, _nanoseconds: now.nanoseconds } as any,
    } as UserSchedule;
    await this.cacheSchedule(cacheableSchedule);
    const userSchedules = await this.getCachedUserSchedules(userId);
    userSchedules.unshift(cacheableSchedule);
    await this.cacheUserSchedules(userId, userSchedules);
    return scheduleId;
  }

  /**
   * Get schedule by ID (local)
   */
  async getSchedule(scheduleId: string, userId: string): Promise<UserSchedule | null> {
    const cached = await this.getCachedSchedule(scheduleId);
    return cached;
  }

  /**
   * Get all schedules for a user (local)
   */
  async getUserSchedules(userId: string): Promise<UserSchedule[]> {
    return await this.getCachedUserSchedules(userId);
  }

  /**
   * Update schedule (local)
   */
  async updateSchedule(
    scheduleId: string, 
    userId: string, 
    updates: Partial<UserSchedule>
  ): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    } as Partial<UserSchedule>;
    const cachedSchedule = await this.getCachedSchedule(scheduleId);
    if (cachedSchedule) {
      const updatedSchedule = { ...cachedSchedule, ...updateData } as UserSchedule;
      await this.cacheSchedule(updatedSchedule);
      const userSchedules = await this.getCachedUserSchedules(userId);
      const idx = userSchedules.findIndex(s => s.id === scheduleId);
      if (idx >= 0) {
        userSchedules[idx] = updatedSchedule;
        await this.cacheUserSchedules(userId, userSchedules);
      }
    }
  }

  /**
   * Delete schedule (local soft delete)
   */
  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    await this.updateSchedule(scheduleId, userId, { isActive: false });
    await this.removeCachedSchedule(scheduleId);
    const userSchedules = await this.getCachedUserSchedules(userId);
    const filtered = userSchedules.filter(s => s.id !== scheduleId);
    await this.cacheUserSchedules(userId, filtered);
  }

  /**
   * Add schedule item to existing schedule
   */
  async addScheduleItem(
    scheduleId: string, 
    userId: string, 
    item: ScheduleItem
  ): Promise<void> {
    try {
      const schedule = await this.getSchedule(scheduleId, userId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const updatedItems = [...schedule.items, item];
      await this.updateSchedule(scheduleId, userId, { items: updatedItems });
    } catch (error) {
      console.error('Error adding schedule item:', error);
      throw error;
    }
  }

  /**
   * Update schedule item
   */
  async updateScheduleItem(
    scheduleId: string, 
    userId: string, 
    itemId: string, 
    updates: Partial<ScheduleItem>
  ): Promise<void> {
    try {
      const schedule = await this.getSchedule(scheduleId, userId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const updatedItems = schedule.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );

      await this.updateSchedule(scheduleId, userId, { items: updatedItems });
    } catch (error) {
      console.error('Error updating schedule item:', error);
      throw error;
    }
  }

  /**
   * Remove schedule item
   */
  async removeScheduleItem(
    scheduleId: string, 
    userId: string, 
    itemId: string
  ): Promise<void> {
    try {
      const schedule = await this.getSchedule(scheduleId, userId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const updatedItems = schedule.items.filter(item => item.id !== itemId);
      await this.updateSchedule(scheduleId, userId, { items: updatedItems });
    } catch (error) {
      console.error('Error removing schedule item:', error);
      throw error;
    }
  }

  /**
   * Real-time listener not supported in frontend-only mode
   */
  subscribeToScheduleChanges(
    userId: string, 
    callback: (schedules: UserSchedule[]) => void
  ): () => void {
    console.warn('Real-time sync is not available in frontend-only mode.');
    return () => {};
  }

  /**
   * Cache schedule locally
   */
  private async cacheSchedule(schedule: UserSchedule): Promise<void> {
    try {
      const storage = getStorageAdapter();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${schedule.id}`;
      await storage.setItem(cacheKey, JSON.stringify(schedule));
    } catch (error) {
      console.error('Error caching schedule:', error);
    }
  }

  /**
   * Get cached schedule
   */
  private async getCachedSchedule(scheduleId: string): Promise<UserSchedule | null> {
    try {
      const storage = getStorageAdapter();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${scheduleId}`;
      const cachedData = await storage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error getting cached schedule:', error);
      return null;
    }
  }

  /**
   * Cache user schedules
   */
  private async cacheUserSchedules(userId: string, schedules: UserSchedule[]): Promise<void> {
    try {
      const storage = getStorageAdapter();
      const cacheKey = `${this.CACHE_KEY_PREFIX}user_${userId}`;
      await storage.setItem(cacheKey, JSON.stringify(schedules));
      await storage.setItem(this.CACHE_EXPIRATION_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error caching user schedules:', error);
    }
  }

  /**
   * Get cached user schedules
   */
  private async getCachedUserSchedules(userId: string): Promise<UserSchedule[]> {
    try {
      const storage = getStorageAdapter();
      const cacheKey = `${this.CACHE_KEY_PREFIX}user_${userId}`;
      const cachedData = await storage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (error) {
      console.error('Error getting cached user schedules:', error);
      return [];
    }
  }

  /**
   * Remove cached schedule
   */
  private async removeCachedSchedule(scheduleId: string): Promise<void> {
    try {
      const storage = getStorageAdapter();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${scheduleId}`;
      await storage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error removing cached schedule:', error);
    }
  }

  /**
   * Check if cache is still valid
   */
  private async isCacheValid(): Promise<boolean> {
    try {
      const storage = getStorageAdapter();
      const expirationTime = await storage.getItem(this.CACHE_EXPIRATION_KEY);
      if (!expirationTime) return false;

      const expirationMs = parseInt(expirationTime) + (this.options.cacheExpirationHours * 60 * 60 * 1000);
      return Date.now() < expirationMs;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all cached schedules
   */
  async clearCache(): Promise<void> {
    try {
      const storage = getStorageAdapter();
      const keys = await storage.getAllKeys();
      const scheduleKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      await storage.multiRemove(scheduleKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Export schedules for backup
   */
  async exportSchedules(userId: string): Promise<UserSchedule[]> {
    return await this.getUserSchedules(userId);
  }

  /**
   * Import schedules from backup
   */
  async importSchedules(userId: string, schedules: UserSchedule[]): Promise<void> {
    for (const schedule of schedules) {
      await this.saveSchedule(userId, {
        userId,
        title: schedule.title,
        description: schedule.description,
        items: schedule.items,
        syncSettings: schedule.syncSettings,
        isActive: schedule.isActive
      });
    }
  }
}

export default ScheduleStorageService.getInstance();
