import type { SupabaseClient } from '@supabase/supabase-js';

// テスト用のSupabaseクライアントインターフェース
export interface TestSupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        single: () => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
      } & {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: unknown[]; error: { message: string; code?: string } | null }>;
      };
      gte: (column: string, value: unknown) => {
        lte: (column: string, value: unknown) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => Promise<{ data: unknown[]; error: { message: string; code?: string } | null }>;
        };
      };
      lte: (column: string, value: unknown) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: unknown[]; error: { message: string; code?: string } | null }>;
      };
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<{ data: unknown[]; error: { message: string; code?: string } | null }>;
    };
    insert: (data: unknown) => Promise<{ error: { message: string; code?: string } | null }>;
    update: (data: unknown) => {
      eq: (
        column: string,
        value: unknown,
      ) => Promise<{ error: { message: string; code?: string } | null }>;
    };
    delete: () => {
      eq: (
        column: string,
        value: unknown,
      ) => Promise<{ error: { message: string; code?: string } | null }>;
      lt: (
        column: string,
        value: unknown,
      ) => Promise<{ error: { message: string; code?: string } | null }>;
    };
  };
}

export interface MockOptions {
  shouldError?: boolean;
  errorMessage?: string;
  errorCode?: string;
}

// 共通のSupabaseクライアントモック作成関数
export function createMockSupabaseClient(
  mockData: unknown[],
  options: MockOptions = {},
): SupabaseClient {
  const {
    shouldError = false,
    errorMessage = 'Mock error',
    errorCode = 'MOCK_ERROR',
  } = options;

  const mockError = shouldError ? { message: errorMessage, code: errorCode } : null;

  const mockQuery = {
    single: () =>
      Promise.resolve({
        data: shouldError ? null : mockData[0],
        error: mockError,
      }),
    order: () =>
      Promise.resolve({
        data: shouldError ? [] : mockData,
        error: mockError,
      }),
  };

  const testClient: TestSupabaseClient = {
    from: () => ({
      select: () => ({
        eq: () => mockQuery,
        gte: () => ({
          lte: () => ({
            order: () => mockQuery.order(),
          }),
        }),
        lte: () => ({
          order: () => mockQuery.order(),
        }),
        order: () => mockQuery.order(),
      }),
      insert: () =>
        Promise.resolve({
          error: mockError,
        }),
      update: () => ({
        eq: () =>
          Promise.resolve({
            error: mockError,
          }),
      }),
      delete: () => ({
        eq: () =>
          Promise.resolve({
            error: mockError,
          }),
        lt: () =>
          Promise.resolve({
            error: mockError,
          }),
      }),
    }),
  };

  return testClient as unknown as SupabaseClient;
}
