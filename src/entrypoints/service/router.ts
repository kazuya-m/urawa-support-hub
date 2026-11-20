export type RouteHandler = (req: Request) => Promise<Response> | Response;

export type Routes = Record<string, RouteHandler>;

export const routeKey = (method: string, pathname: string) => `${method} ${pathname}`;

export async function handleRequest(req: Request, routes: Routes): Promise<Response> {
  const url = new URL(req.url);
  const handler = routes[routeKey(req.method, url.pathname)];

  if (handler) {
    return await handler(req);
  }

  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `${req.method} ${url.pathname} is not supported`,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
