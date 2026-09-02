import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
};

export const mockApiClient = {
  request: async (endpoint: string, options?: any) => {
    return mockApi.request(endpoint, options);
  },
  get: async (endpoint: string, options?: any) => {
    return mockApi.get(endpoint, options);
  },
  post: async (endpoint: string, data?: any, options?: any) => {
    return mockApi.post(endpoint, data, options);
  },
  patch: async (endpoint: string, data?: any, options?: any) => {
    return mockApi.patch(endpoint, data, options);
  },
  put: async (endpoint: string, data?: any, options?: any) => {
    return mockApi.put(endpoint, data, options);
  },
  delete: async (endpoint: string, options?: any) => {
    return mockApi.delete(endpoint, options);
  },
};

export function resetApiMocks() {
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.patch.mockReset();
  mockApi.put.mockReset();
  mockApi.delete.mockReset();
  mockApi.request.mockReset();
}
