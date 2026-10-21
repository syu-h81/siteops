type RequestLike = Pick<Request, "headers" | "url">;

export function hasJsonContentType(request: RequestLike): boolean {
  const contentType = request.headers.get("content-type");

  return (
    contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json"
  );
}

export function hasSameOrigin(request: RequestLike): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
