import { describe, expect, it, vi } from 'vitest'
import { dedupeAsync } from './dedupeAsync'

// Pins the fix for a real bug: the auth store's token refresh used to be deduped
// per useApi() instance, so two composables hitting a 401 around the same time (e.g.
// the AppBar's notification poll and a page's own data fetch) each rotated the
// single-use refresh token and raced each other into an unwanted logout. See
// features/auth/stores/auth.ts's refreshOnce().
describe('dedupeAsync', () => {
  it('shares a single in-flight call across concurrent invocations', async () => {
    let calls = 0
    const fn = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          calls++
          setTimeout(() => resolve(calls), 10)
        })
    )
    const deduped = dedupeAsync(fn)

    const [a, b] = await Promise.all([deduped(), deduped()])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('starts a fresh call once the previous one has settled', async () => {
    const fn = vi.fn(async () => 'result')
    const deduped = dedupeAsync(fn)

    await deduped()
    await deduped()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('clears the in-flight call on rejection too, so the next call retries', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const deduped = dedupeAsync(fn)

    await expect(deduped()).rejects.toThrow('boom')
    await expect(deduped()).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('shares a rejection with every caller that overlapped it', async () => {
    const fn = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('boom')), 10)
        })
    )
    const deduped = dedupeAsync(fn)

    const results = await Promise.allSettled([deduped(), deduped()])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
  })
})
