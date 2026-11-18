export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function publicError(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (
    error.message.startsWith("Set ") ||
    error.message.startsWith("Could not reach")
  ) {
    return error.message;
  }
  return null;
}

export function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

export function routeError(error: unknown): Response {
  if (error instanceof AuthError) return jsonError(error.message, error.status);
  const message = publicError(error);
  if (message) return jsonError(message, 503);
  return jsonError("Something went wrong. Try again.", 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
