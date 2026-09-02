/**
 * Real Device Capabilities Matrix
 * Maps device models to their capabilities and testing requirements
 */

export interface DeviceCapability {
  name: string;
  os: 'iOS' | 'Android';
  osVersion: string;
  screenSize: { width: number; height: number };
  hasNotch: boolean;
  hasSafeArea: boolean;
  capabilities: {
    camera: boolean;
    location: boolean;
    biometric: boolean;
    storage: number; // GB
  };
  performanceBaseline: {
    pageLoadTime: number; // ms
    apiResponseTime: number; // ms
    memoryUsage: number; // MB
  };
  screenshotThreshold: {
    tolerance: number; // 0-1
    maxDiffPixels: number;
  };
}

export const REAL_DEVICE_CAPABILITIES: Record<string, DeviceCapability> = {
  // iOS Devices
  'iPhone-13': {
    name: 'iPhone 13',
    os: 'iOS',
    osVersion: '15',
    screenSize: { width: 390, height: 844 },
    hasNotch: true,
    hasSafeArea: true,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 128,
    },
    performanceBaseline: {
      pageLoadTime: 3000,
      apiResponseTime: 1500,
      memoryUsage: 256,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 100,
    },
  },
  'iPhone-14': {
    name: 'iPhone 14',
    os: 'iOS',
    osVersion: '16',
    screenSize: { width: 390, height: 844 },
    hasNotch: true,
    hasSafeArea: true,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 128,
    },
    performanceBaseline: {
      pageLoadTime: 2800,
      apiResponseTime: 1400,
      memoryUsage: 256,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 100,
    },
  },
  'iPhone-14-Pro': {
    name: 'iPhone 14 Pro',
    os: 'iOS',
    osVersion: '16',
    screenSize: { width: 393, height: 852 },
    hasNotch: true,
    hasSafeArea: true,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 256,
    },
    performanceBaseline: {
      pageLoadTime: 2600,
      apiResponseTime: 1300,
      memoryUsage: 512,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 80,
    },
  },

  // Android Devices
  'Pixel-5': {
    name: 'Google Pixel 5',
    os: 'Android',
    osVersion: '12',
    screenSize: { width: 393, height: 851 },
    hasNotch: false,
    hasSafeArea: false,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 128,
    },
    performanceBaseline: {
      pageLoadTime: 3100,
      apiResponseTime: 1600,
      memoryUsage: 384,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 120,
    },
  },
  'Pixel-6': {
    name: 'Google Pixel 6',
    os: 'Android',
    osVersion: '13',
    screenSize: { width: 412, height: 915 },
    hasNotch: false,
    hasSafeArea: false,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 128,
    },
    performanceBaseline: {
      pageLoadTime: 2900,
      apiResponseTime: 1500,
      memoryUsage: 384,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 100,
    },
  },
  'Samsung-S21': {
    name: 'Samsung Galaxy S21',
    os: 'Android',
    osVersion: '12',
    screenSize: { width: 360, height: 800 },
    hasNotch: true,
    hasSafeArea: false,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 256,
    },
    performanceBaseline: {
      pageLoadTime: 3200,
      apiResponseTime: 1700,
      memoryUsage: 512,
    },
    screenshotThreshold: {
      tolerance: 0.06,
      maxDiffPixels: 150,
    },
  },
  'Samsung-S22': {
    name: 'Samsung Galaxy S22',
    os: 'Android',
    osVersion: '13',
    screenSize: { width: 360, height: 800 },
    hasNotch: true,
    hasSafeArea: false,
    capabilities: {
      camera: true,
      location: true,
      biometric: true,
      storage: 256,
    },
    performanceBaseline: {
      pageLoadTime: 3000,
      apiResponseTime: 1600,
      memoryUsage: 512,
    },
    screenshotThreshold: {
      tolerance: 0.05,
      maxDiffPixels: 120,
    },
  },
};

/**
 * Get capabilities for a specific device
 */
export function getDeviceCapabilities(deviceId: string): DeviceCapability | undefined {
  return REAL_DEVICE_CAPABILITIES[deviceId];
}

/**
 * Get all iOS devices
 */
export function getIOSDevices(): Record<string, DeviceCapability> {
  return Object.entries(REAL_DEVICE_CAPABILITIES)
    .filter(([, cap]) => cap.os === 'iOS')
    .reduce((acc, [key, cap]) => ({ ...acc, [key]: cap }), {});
}

/**
 * Get all Android devices
 */
export function getAndroidDevices(): Record<string, DeviceCapability> {
  return Object.entries(REAL_DEVICE_CAPABILITIES)
    .filter(([, cap]) => cap.os === 'Android')
    .reduce((acc, [key, cap]) => ({ ...acc, [key]: cap }), {});
}

/**
 * Get devices by OS version
 */
export function getDevicesByOSVersion(os: 'iOS' | 'Android', version: string): Record<string, DeviceCapability> {
  return Object.entries(REAL_DEVICE_CAPABILITIES)
    .filter(([, cap]) => cap.os === os && cap.osVersion === version)
    .reduce((acc, [key, cap]) => ({ ...acc, [key]: cap }), {});
}

/**
 * Get devices with specific capability
 */
export function getDevicesWithCapability(
  capability: 'camera' | 'location' | 'biometric'
): Record<string, DeviceCapability> {
  return Object.entries(REAL_DEVICE_CAPABILITIES)
    .filter(([, cap]) => cap.capabilities[capability])
    .reduce((acc, [key, cap]) => ({ ...acc, [key]: cap }), {});
}

/**
 * Compare performance baseline between devices
 */
export function comparePerformance(device1Id: string, device2Id: string): {
  device1: string;
  device2: string;
  pageLoadDiff: number; // ms
  apiResponseDiff: number; // ms
  memoryDiff: number; // MB
} | null {
  const cap1 = getDeviceCapabilities(device1Id);
  const cap2 = getDeviceCapabilities(device2Id);

  if (!cap1 || !cap2) return null;

  return {
    device1: cap1.name,
    device2: cap2.name,
    pageLoadDiff: cap1.performanceBaseline.pageLoadTime - cap2.performanceBaseline.pageLoadTime,
    apiResponseDiff: cap1.performanceBaseline.apiResponseTime - cap2.performanceBaseline.apiResponseTime,
    memoryDiff: cap1.performanceBaseline.memoryUsage - cap2.performanceBaseline.memoryUsage,
  };
}

/**
 * Get screenshot threshold for device
 */
export function getScreenshotThreshold(deviceId: string): DeviceCapability['screenshotThreshold'] | null {
  const cap = getDeviceCapabilities(deviceId);
  return cap?.screenshotThreshold || null;
}

/**
 * Validate performance metrics against baseline
 */
export function validatePerformance(
  deviceId: string,
  metrics: { pageLoadTime: number; apiResponseTime: number; memoryUsage: number }
): { valid: boolean; violations: string[] } {
  const cap = getDeviceCapabilities(deviceId);
  if (!cap) return { valid: false, violations: ['Device not found'] };

  const violations: string[] = [];
  const baseline = cap.performanceBaseline;

  // Allow 20% variance
  const pageLoadTolerance = baseline.pageLoadTime * 1.2;
  const apiResponseTolerance = baseline.apiResponseTime * 1.2;
  const memoryTolerance = baseline.memoryUsage * 1.3;

  if (metrics.pageLoadTime > pageLoadTolerance) {
    violations.push(`Page load time ${metrics.pageLoadTime}ms exceeds baseline ${pageLoadTolerance}ms`);
  }

  if (metrics.apiResponseTime > apiResponseTolerance) {
    violations.push(`API response time ${metrics.apiResponseTime}ms exceeds baseline ${apiResponseTolerance}ms`);
  }

  if (metrics.memoryUsage > memoryTolerance) {
    violations.push(`Memory usage ${metrics.memoryUsage}MB exceeds baseline ${memoryTolerance}MB`);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
