import { createClient, RedisClientType } from 'redis';

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  cachedReports: number;
}

export class ReportCacheService {
  private client: RedisClientType;
  private hits: number = 0;
  private misses: number = 0;
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${parseInt(process.env.REDIS_PORT || '6379')}`,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private getCacheKey(portfolioId: string, reportType: string): string {
    return `report:${portfolioId}:${reportType}`;
  }

  async getCachedReport(portfolioId: string, reportType: string): Promise<Buffer | null> {
    await this.connect();

    const key = this.getCacheKey(portfolioId, reportType);

    try {
      const cached = await this.client.get(key);

      if (cached) {
        this.hits++;
        return Buffer.from(cached, 'base64');
      }

      this.misses++;
      return null;
    } catch (error) {
      console.error('Error getting cached report:', error);
      this.misses++;
      return null;
    }
  }

  async cacheReport(
    portfolioId: string,
    reportType: string,
    reportBuffer: Buffer,
    ttl?: number
  ): Promise<void> {
    await this.connect();

    const key = this.getCacheKey(portfolioId, reportType);
    const base64Report = reportBuffer.toString('base64');
    const expiryTime = ttl || this.DEFAULT_TTL;

    try {
      await this.client.setEx(key, expiryTime, base64Report);
    } catch (error) {
      console.error('Error caching report:', error);
    }
  }

  async invalidateCache(portfolioId: string, reportType?: string): Promise<void> {
    await this.connect();

    try {
      if (reportType) {
        const key = this.getCacheKey(portfolioId, reportType);
        await this.client.del(key);
      } else {
        // Invalidate all report types for this portfolio
        const keys = await this.client.keys(`report:${portfolioId}:*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  async invalidateCacheForProperty(propertyId: string): Promise<void> {
    await this.connect();

    try {
      // Get all portfolios containing this property (implementation-specific)
      // For now, just log the action
      console.log(`Invalidating cache for property ${propertyId}`);
    } catch (error) {
      console.error('Error invalidating property cache:', error);
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    await this.connect();

    try {
      const keys = await this.client.keys('report:*');
      const total = this.hits + this.misses;
      const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
      const missRate = total > 0 ? (this.misses / total) * 100 : 0;

      return {
        hitRate: parseFloat(hitRate.toFixed(2)),
        missRate: parseFloat(missRate.toFixed(2)),
        totalHits: this.hits,
        totalMisses: this.misses,
        cachedReports: keys.length,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hitRate: 0,
        missRate: 0,
        totalHits: this.hits,
        totalMisses: this.misses,
        cachedReports: 0,
      };
    }
  }

  async clearAllCache(): Promise<void> {
    await this.connect();

    try {
      const keys = await this.client.keys('report:*');
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async warmCache(portfolioIds: string[], reportTypes: string[] = ['summary', 'full', 'executive']): Promise<number> {
    // Pre-generate and cache reports for better performance
    // Implementation depends on reportGenerationService
    let count = 0;
    console.log(`Warming cache for ${portfolioIds.length} portfolios and ${reportTypes.length} report types`);
    return count;
  }

  async getMemoryUsage(): Promise<{ usedMemory: string; totalMemory: string }> {
    await this.connect();

    try {
      const info = await this.client.info('memory');
      const lines = info.split('\r\n');
      let usedMemory = 'N/A';
      let maxMemory = 'N/A';

      lines.forEach((line) => {
        if (line.startsWith('used_memory_human:')) {
          usedMemory = line.split(':')[1];
        }
        if (line.startsWith('maxmemory_human:')) {
          maxMemory = line.split(':')[1];
        }
      });

      return {
        usedMemory,
        totalMemory: maxMemory,
      };
    } catch (error) {
      console.error('Error getting memory usage:', error);
      return { usedMemory: 'N/A', totalMemory: 'N/A' };
    }
  }
}

export const reportCacheService = new ReportCacheService();
