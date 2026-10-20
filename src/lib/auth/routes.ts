const PROTECTED_ROUTE_PREFIXES = [
  "/onboarding",
  "/dashboard",
  "/clients",
  "/sites",
  "/contracts",
  "/tasks",
  "/renewals",
  "/work-logs",
  "/settings",
] as const;

const GUEST_ONLY_ROUTES = ["/login", "/signup", "/forgot-password"] as const;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some((route) =>
    matchesRoute(pathname, route),
  );
}

export function isGuestOnlyRoute(pathname: string) {
  return GUEST_ONLY_ROUTES.some((route) => matchesRoute(pathname, route));
}
