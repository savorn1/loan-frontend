const STORAGE_KEY = 'recentPages'
const MAX_RECENT = 5

// Same SSR-safe useState + localStorage pattern as useRecentReports — shared
// across layouts/default.vue (which records each navigation) and
// CommandPalette (which renders the list as a "Recent" group).
export function useRecentPages() {
  const recent = useState<string[]>('recent-pages', () => [])

  onMounted(() => {
    if (recent.value.length > 0) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) recent.value = JSON.parse(stored)
    } catch {
      // ignore corrupt storage
    }
  })

  function recordVisit(path: string) {
    // Re-reads localStorage directly rather than trusting `recent.value` —
    // recordVisit can fire before the onMounted load above has run (hook
    // order isn't guaranteed across component instances), and starting from
    // a stale/empty in-memory value would silently drop prior history.
    let current: string[] = recent.value
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) current = JSON.parse(stored)
    } catch {
      // ignore corrupt storage
    }
    const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX_RECENT)
    recent.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { recent, recordVisit }
}
