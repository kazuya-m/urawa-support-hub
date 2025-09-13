import { type HttpStatusCode, HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';

export class HttpResponseBuilder {
  static json(data: Record<string, unknown>, status: HttpStatusCode): Response {
    return new Response(
      JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  static success(data: Record<string, unknown>): Response {
    return this.json({
      status: 'success',
      ...data,
    }, HttpStatusCodes.OK);
  }

  static error(
    message: string,
    details?: unknown,
    status: HttpStatusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ): Response {
    const data: Record<string, unknown> = { error: message };
    if (details !== undefined) {
      data.details = details;
    }
    return this.json(data, status);
  }

  static unauthorized(details?: string): Response {
    return this.error(
      'Unauthorized',
      details || 'Invalid or missing authentication',
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  static badRequest(details: string): Response {
    return this.error('Bad Request', details, HttpStatusCodes.BAD_REQUEST);
  }
}
