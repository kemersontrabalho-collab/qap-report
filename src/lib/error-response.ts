import { renderErrorPage } from "./error-page";

export function expectsHtmlDocument(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return (request.headers.get("accept") ?? "").split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(";");
    if (mediaType.trim() !== "text/html") return false;
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return quality === undefined || Number(quality.trim().slice(2)) > 0;
  });
}

export function createUnexpectedErrorResponse(request: Request): Response {
  const html = expectsHtmlDocument(request);
  return new Response(
    request.method === "HEAD"
      ? null
      : html
        ? renderErrorPage()
        : JSON.stringify({ error: "internal_server_error" }),
    {
      status: 500,
      headers: {
        "content-type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
