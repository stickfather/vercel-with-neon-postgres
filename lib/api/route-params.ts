export type RouteParamsContext = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

export async function resolveRouteParams(
  context: RouteParamsContext,
): Promise<Record<string, string | string[] | undefined>> {
  try {
    return (await context.params) ?? {};
  } catch (error) {
    console.error("No se pudieron resolver los parámetros de la ruta", error);
    return {};
  }
}

export function readRouteParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}
