import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getErrorDetails, getErrorMessage, getErrorStack, toErrorInfo } from '../errorUtils.ts';

Deno.test('getErrorMessage', async (t) => {
  await t.step('should extract message from Error instance', () => {
    const error = new Error('Test error message');
    assertEquals(getErrorMessage(error), 'Test error message');
  });

  await t.step('should return string directly', () => {
    const error = 'String error message';
    assertEquals(getErrorMessage(error), 'String error message');
  });

  await t.step('should extract message from object with message property', () => {
    const error = { message: 'Object error message' };
    assertEquals(getErrorMessage(error), 'Object error message');
  });

  await t.step('should return default message for unknown error type', () => {
    const error = 42;
    assertEquals(getErrorMessage(error), 'Unknown error occurred');
  });

  await t.step('should return default message for null/undefined', () => {
    assertEquals(getErrorMessage(null), 'Unknown error occurred');
    assertEquals(getErrorMessage(undefined), 'Unknown error occurred');
  });
});

Deno.test('getErrorStack', async (t) => {
  await t.step('should return stack in non-production environment', () => {
    // Save original env
    const originalEnv = Deno.env.get('NODE_ENV');

    try {
      // Set development environment
      Deno.env.set('NODE_ENV', 'development');

      const error = new Error('Test error');
      const stack = getErrorStack(error);

      assertEquals(typeof stack, 'string');
      assertStringIncludes(stack!, 'Error: Test error');
    } finally {
      // Restore original env
      if (originalEnv !== undefined) {
        Deno.env.set('NODE_ENV', originalEnv);
      } else {
        Deno.env.delete('NODE_ENV');
      }
    }
  });

  await t.step('should return undefined in production environment', () => {
    // Save original env
    const originalEnv = Deno.env.get('NODE_ENV');

    try {
      // Set production environment
      Deno.env.set('NODE_ENV', 'production');

      const error = new Error('Test error');
      const stack = getErrorStack(error);

      assertEquals(stack, undefined);
    } finally {
      // Restore original env
      if (originalEnv !== undefined) {
        Deno.env.set('NODE_ENV', originalEnv);
      } else {
        Deno.env.delete('NODE_ENV');
      }
    }
  });

  await t.step('should return undefined for non-Error objects', () => {
    assertEquals(getErrorStack('string error'), undefined);
    assertEquals(getErrorStack({ message: 'object error' }), undefined);
  });
});

Deno.test('getErrorDetails', async (t) => {
  await t.step('should extract additional properties from Error', () => {
    const error = new Error('Test error');
    // 型安全な方法でエラーオブジェクトにプロパティを追加
    Object.assign(error, {
      code: 'TEST_CODE',
      statusCode: 400,
      hint: 'Test hint',
    });

    const details = getErrorDetails(error);

    assertEquals(details, {
      code: 'TEST_CODE',
      statusCode: 400,
      hint: 'Test hint',
    });
  });

  await t.step('should return undefined for Error with no additional properties', () => {
    const error = new Error('Simple error');
    const details = getErrorDetails(error);

    assertEquals(details, undefined);
  });

  await t.step('should return object for non-Error objects', () => {
    const error = { message: 'Test', customField: 'value' };
    const details = getErrorDetails(error);

    assertEquals(details, { message: 'Test', customField: 'value' });
  });

  await t.step('should return undefined for primitive values', () => {
    assertEquals(getErrorDetails('string'), undefined);
    assertEquals(getErrorDetails(42), undefined);
    assertEquals(getErrorDetails(null), undefined);
  });
});

Deno.test('toErrorInfo', async (t) => {
  await t.step('should create ErrorInfo from Error instance', () => {
    // Save original env
    const originalEnv = Deno.env.get('NODE_ENV');

    try {
      // Set development environment to get stack
      Deno.env.set('NODE_ENV', 'development');

      const error = new Error('Test error');
      const errorInfo = toErrorInfo(error, 'TEST_CODE', false);

      assertEquals(errorInfo.code, 'TEST_CODE');
      assertEquals(errorInfo.message, 'Test error');
      assertEquals(errorInfo.recoverable, false);
      assertEquals(typeof errorInfo.stack, 'string');
    } finally {
      // Restore original env
      if (originalEnv !== undefined) {
        Deno.env.set('NODE_ENV', originalEnv);
      } else {
        Deno.env.delete('NODE_ENV');
      }
    }
  });

  await t.step('should use default recoverable value', () => {
    const error = new Error('Test error');
    const errorInfo = toErrorInfo(error, 'TEST_CODE');

    assertEquals(errorInfo.recoverable, true);
  });

  await t.step('should handle string errors', () => {
    const error = 'String error';
    const errorInfo = toErrorInfo(error, 'TEST_CODE');

    assertEquals(errorInfo.code, 'TEST_CODE');
    assertEquals(errorInfo.message, 'String error');
    assertEquals(errorInfo.recoverable, true);
    assertEquals(errorInfo.details, undefined);
  });

  await t.step('should handle complex error objects', () => {
    const error = {
      message: 'Complex error',
      statusCode: 500,
      customField: 'value',
    };
    const errorInfo = toErrorInfo(error, 'COMPLEX_ERROR');

    assertEquals(errorInfo.code, 'COMPLEX_ERROR');
    assertEquals(errorInfo.message, 'Complex error');
    assertEquals(errorInfo.details, error);
  });

  await t.step('should handle undefined code', () => {
    const error = new Error('Test error');
    const errorInfo = toErrorInfo(error);

    assertEquals(errorInfo.code, undefined);
    assertEquals(errorInfo.message, 'Test error');
  });
});
