// Every backend service wraps its payload in an ApiResponse envelope
// ({ traceId, statusCode, message, data }) — except paginated `getAll`
// endpoints, which return a bare PageResponse. Shared by every $fetch
// client so callers get the payload type directly, matching their T.
export function unwrapApiResponse({ response }: { response: { _data?: unknown } }) {
  const body = response._data
  if (body && typeof body === 'object' && 'traceId' in body && 'data' in body) {
    response._data = (body as { data: unknown }).data
  }
}
