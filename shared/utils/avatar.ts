// Auto-imported (shared/utils is in nuxt.config imports.dirs).
// Deterministic pastel gradient per name so every user/customer gets their own
// consistent avatar color instead of the same flat gray circle everywhere.

const GRADIENTS = [
  'bg-gradient-to-br from-rose-400 to-orange-400',
  'bg-gradient-to-br from-amber-400 to-yellow-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-sky-400 to-blue-500',
  'bg-gradient-to-br from-indigo-400 to-violet-500',
  'bg-gradient-to-br from-fuchsia-400 to-pink-500'
]

export function avatarGradient(name: string | null | undefined): string {
  if (!name) return GRADIENTS[3]!
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return GRADIENTS[hash % GRADIENTS.length]!
}
