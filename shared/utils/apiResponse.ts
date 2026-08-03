export function unwrapApiResponse({ response }: { response: { _data?: unknown } }) {
  const body = response._data
  if (!body || typeof body !== 'object' || !('traceId' in body) || !('data' in body)) return

  const envelope = body as { data: unknown; metadata?: Record<string, unknown> }
  if (envelope.metadata && typeof envelope.metadata === 'object') {
    const m = envelope.metadata
    response._data = {
      content: envelope.data,
      page: m.currentPage,
      size: m.limit,
      totalElements: m.totalCount,
      totalPages: m.totalPage,
      hasNext: m.hasNext,
      hasPrevious: m.hasPrev
    }
  } else {
    response._data = envelope.data
  }
}
