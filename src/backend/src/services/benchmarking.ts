/**
 * Benchmarking Framework (Phase 7 Sprint 4)
 *
 * Provides tools for benchmarking and performance testing,
 * comparing implementations and optimizing critical paths.
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  duration: number; // total milliseconds
  opsPerSecond: number;
  avgTime: number; // milliseconds per operation
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  memory: {
    heapBefore: number;
    heapAfter: number;
    heapDelta: number;
  };
}

export interface ComparisonResult {
  winner: string;
  speedup: number;
  percentageImprovement: number;
  results: BenchmarkResult[];
}

/**
 * Simple benchmark function
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 10000
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const heapBefore = process.memoryUsage().heapUsed;

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now();
    await fn();
    const opEnd = performance.now();
    times.push(opEnd - opStart);
  }

  const endTime = performance.now();
  const heapAfter = process.memoryUsage().heapUsed;
  const totalDuration = endTime - startTime;

  times.sort((a, b) => a - b);

  return {
    name,
    iterations,
    duration: totalDuration,
    opsPerSecond: (iterations / totalDuration) * 1000,
    avgTime: times.reduce((a, b) => a + b, 0) / iterations,
    minTime: times[0],
    maxTime: times[iterations - 1],
    p50: times[Math.floor(iterations * 0.5)],
    p95: times[Math.floor(iterations * 0.95)],
    p99: times[Math.floor(iterations * 0.99)],
    memory: {
      heapBefore,
      heapAfter,
      heapDelta: heapAfter - heapBefore,
    },
  };
}

/**
 * Compare two implementations
 */
export async function compare(
  name1: string,
  fn1: () => void | Promise<void>,
  name2: string,
  fn2: () => void | Promise<void>,
  iterations: number = 10000
): Promise<ComparisonResult> {
  const result1 = await benchmark(name1, fn1, iterations);
  const result2 = await benchmark(name2, fn2, iterations);

  const speedup = result2.avgTime / result1.avgTime;
  const percentageImprovement = ((speedup - 1) * 100).toFixed(2);

  return {
    winner: speedup > 1 ? name1 : name2,
    speedup: Math.abs(speedup),
    percentageImprovement: Number(percentageImprovement),
    results: speedup > 1 ? [result1, result2] : [result2, result1],
  };
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `
Benchmark: ${result.name}
────────────────────────────────────
Iterations: ${result.iterations.toLocaleString()}
Total Time: ${result.duration.toFixed(2)}ms
Ops/sec: ${result.opsPerSecond.toFixed(0)}

Timings (ms):
  Average: ${result.avgTime.toFixed(3)}
  Min: ${result.minTime.toFixed(3)}
  Max: ${result.maxTime.toFixed(3)}
  P50: ${result.p50.toFixed(3)}
  P95: ${result.p95.toFixed(3)}
  P99: ${result.p99.toFixed(3)}

Memory:
  Before: ${(result.memory.heapBefore / 1024 / 1024).toFixed(2)}MB
  After: ${(result.memory.heapAfter / 1024 / 1024).toFixed(2)}MB
  Delta: ${(result.memory.heapDelta / 1024).toFixed(2)}KB
`;
}

/**
 * Format comparison results
 */
export function formatComparisonResult(result: ComparisonResult): string {
  const [winner, loser] = result.results;

  return `
Performance Comparison
────────────────────────────────────
Winner: ${result.winner} (${result.speedup.toFixed(2)}x faster)
Improvement: ${result.percentageImprovement}%

First Implementation: ${winner.name}
  Avg Time: ${winner.avgTime.toFixed(3)}ms
  Ops/sec: ${winner.opsPerSecond.toFixed(0)}

Second Implementation: ${loser.name}
  Avg Time: ${loser.avgTime.toFixed(3)}ms
  Ops/sec: ${loser.opsPerSecond.toFixed(0)}

Difference: ${Math.abs(winner.avgTime - loser.avgTime).toFixed(3)}ms per operation
`;
}

/**
 * Predefined benchmark suites
 */
export const BenchmarkSuites = {
  /**
   * Encryption benchmark suite
   */
  encryption: {
    aes256Encryption: async () => {
      const { encrypt } = await import('./encryption.js');
      const plaintext = 'This is test data for encryption';

      return benchmark('AES-256-GCM Encryption', () => {
        encrypt(plaintext);
      });
    },

    aes256Decryption: async () => {
      const { encrypt, decrypt } = await import('./encryption.js');
      const plaintext = 'This is test data for encryption';
      const encrypted = encrypt(plaintext);

      return benchmark('AES-256-GCM Decryption', () => {
        decrypt(encrypted);
      });
    },

    passwordHashing: async () => {
      const { hashPassword } = await import('./encryption.js');
      const password = 'TestPassword123!';

      return benchmark('PBKDF2 Password Hashing', () => {
        hashPassword(password);
      }, 100); // Reduced iterations due to CPU intensity
    },
  },

  /**
   * Input validation benchmark suite
   */
  validation: {
    emailValidation: async () => {
      const { validateEmail } = await import('../middleware/inputValidation.js');
      const email = 'user@example.com';

      return benchmark('Email Validation', () => {
        validateEmail(email);
      });
    },

    xssDetection: async () => {
      const { detectXss } = await import('../middleware/inputValidation.js');
      const payload = '<img src="x" onerror="alert(1)">';

      return benchmark('XSS Detection', () => {
        detectXss(payload);
      });
    },

    sqlInjectionDetection: async () => {
      const { detectSqlInjection } = await import('../middleware/inputValidation.js');
      const payload = "'; DROP TABLE users; --";

      return benchmark('SQL Injection Detection', () => {
        detectSqlInjection(payload);
      });
    },

    passwordStrengthValidation: async () => {
      const { validatePasswordStrength } = await import('../middleware/inputValidation.js');
      const password = 'TestPassword123!@#';

      return benchmark('Password Strength Validation', () => {
        validatePasswordStrength(password);
      });
    },
  },

  /**
   * Serialization benchmark suite
   */
  serialization: {
    jsonStringify: async () => {
      const obj = {
        userId: '12345',
        email: 'user@example.com',
        profile: {
          name: 'John Doe',
          age: 30,
          tags: ['tag1', 'tag2', 'tag3'],
        },
      };

      return benchmark('JSON.stringify', () => {
        JSON.stringify(obj);
      });
    },

    jsonParse: async () => {
      const json =
        '{"userId":"12345","email":"user@example.com","profile":{"name":"John Doe","age":30,"tags":["tag1","tag2","tag3"]}}';

      return benchmark('JSON.parse', () => {
        JSON.parse(json);
      });
    },
  },

  /**
   * Array operations benchmark suite
   */
  arrayOperations: {
    arrayFilter: async () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);

      return benchmark('Array.filter', () => {
        arr.filter((n) => n % 2 === 0);
      });
    },

    arrayMap: async () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);

      return benchmark('Array.map', () => {
        arr.map((n) => n * 2);
      });
    },

    arraySort: async () => {
      const arr = Array.from({ length: 1000 }, () => Math.random());

      return benchmark('Array.sort', () => {
        [...arr].sort((a, b) => a - b);
      });
    },
  },

  /**
   * String operations benchmark suite
   */
  stringOperations: {
    stringReplace: async () => {
      const str = 'This is a test string with multiple spaces';

      return benchmark('String.replace', () => {
        str.replace(/\s+/g, ' ');
      });
    },

    stringSubstring: async () => {
      const str = 'a'.repeat(10000);

      return benchmark('String.substring', () => {
        str.substring(0, 100);
      });
    },

    stringRegexMatch: async () => {
      const str = 'test@example.com';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      return benchmark('Regex.match', () => {
        regex.test(str);
      });
    },
  },
};

/**
 * Run a benchmark suite
 */
export async function runBenchmarkSuite(
  suite: Record<string, () => Promise<BenchmarkResult>>
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const [, benchmarkFn] of Object.entries(suite)) {
    try {
      const result = await benchmarkFn();
      results.push(result);
      console.log(formatBenchmarkResult(result));
    } catch (error) {
      console.error(`Benchmark failed: ${error}`);
    }
  }

  return results;
}

/**
 * Performance profile function
 */
export async function profile(
  name: string,
  fn: () => Promise<void>,
  duration: number = 5000
): Promise<{
  name: string;
  executionCount: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
  peakMemory: number;
}> {
  const startTime = performance.now();
  const endTime = startTime + duration;
  const memorySnapshots: number[] = [];
  let executionCount = 0;

  while (performance.now() < endTime) {
    await fn();
    executionCount++;
    memorySnapshots.push(process.memoryUsage().heapUsed);
  }

  const totalTime = performance.now() - startTime;
  const peakMemory = Math.max(...memorySnapshots);

  return {
    name,
    executionCount,
    totalTime,
    avgTime: totalTime / executionCount,
    opsPerSecond: (executionCount / totalTime) * 1000,
    peakMemory,
  };
}

export default {
  benchmark,
  compare,
  formatBenchmarkResult,
  formatComparisonResult,
  BenchmarkSuites,
  runBenchmarkSuite,
  profile,
};
