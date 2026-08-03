<template>
  <div class="flex gap-2">
    <USelectMenu
      v-model="selectedIso2"
      :options="COUNTRIES"
      option-attribute="name"
      value-attribute="iso2"
      :search-attributes="['name', 'dialCode']"
      searchable
      :searchable-placeholder="t('phoneInput.searchCountry')"
      :disabled="disabled"
      class="w-28 shrink-0"
      :aria-label="t('phoneInput.countryCode')"
    >
      <template #label>
        <span class="truncate">{{
          selectedCountry
            ? `${selectedCountry.flag} ${selectedCountry.dialCode}`
            : t('phoneInput.codeFallback')
        }}</span>
      </template>
      <template #option="{ option }">
        <span class="truncate">{{ option.flag }} {{ option.name }} ({{ option.dialCode }})</span>
      </template>
    </USelectMenu>
    <UInput
      v-model="nationalNumber"
      type="tel"
      autocomplete="tel-national"
      class="flex-1"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="t('phoneInput.phoneNumber')"
    />
  </div>
</template>

<script setup lang="ts">
// Dependency-free phone input (Backpack's Pro `phone` field, minus the
// external intl-tel-input widget it's normally built on): a dial-code select
// plus a plain national-number box, combined into one "+855 12 345 678"
// string — same plain-string contract as the DTOs' existing `phone` fields,
// so no shape change is needed anywhere this replaces a text field.
//
// Curated subset of countries (not the full ISO-3166 list) — extend
// COUNTRIES below if a country you need isn't here.
const COUNTRIES = [
  { iso2: 'KH', name: 'Cambodia', dialCode: '+855' },
  { iso2: 'VN', name: 'Vietnam', dialCode: '+84' },
  { iso2: 'TH', name: 'Thailand', dialCode: '+66' },
  { iso2: 'LA', name: 'Laos', dialCode: '+856' },
  { iso2: 'MM', name: 'Myanmar', dialCode: '+95' },
  { iso2: 'SG', name: 'Singapore', dialCode: '+65' },
  { iso2: 'MY', name: 'Malaysia', dialCode: '+60' },
  { iso2: 'ID', name: 'Indonesia', dialCode: '+62' },
  { iso2: 'PH', name: 'Philippines', dialCode: '+63' },
  { iso2: 'US', name: 'United States', dialCode: '+1' },
  { iso2: 'CA', name: 'Canada', dialCode: '+1' },
  { iso2: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { iso2: 'AU', name: 'Australia', dialCode: '+61' },
  { iso2: 'IN', name: 'India', dialCode: '+91' },
  { iso2: 'CN', name: 'China', dialCode: '+86' },
  { iso2: 'JP', name: 'Japan', dialCode: '+81' },
  { iso2: 'KR', name: 'South Korea', dialCode: '+82' },
  { iso2: 'FR', name: 'France', dialCode: '+33' },
  { iso2: 'DE', name: 'Germany', dialCode: '+49' },
  { iso2: 'AE', name: 'United Arab Emirates', dialCode: '+971' }
].map((c) => ({ ...c, flag: toFlagEmoji(c.iso2) }))

function toFlagEmoji(iso2: string): string {
  return String.fromCodePoint(...[...iso2].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    placeholder?: string
    /** ISO-3166 alpha-2 country to assume when the value has no recognized dial code. */
    defaultCountry?: string
  }>(),
  {
    disabled: false,
    placeholder: undefined,
    defaultCountry: 'KH'
  }
)

const model = defineModel<string>({ default: '' })

// Longest dial code first so '+1' doesn't shadow a longer code that also
// starts with '1' (none currently do, but stays correct as COUNTRIES grows).
function parse(value: string) {
  const match = [...COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => value.startsWith(c.dialCode))
  return match
    ? { iso2: match.iso2, national: value.slice(match.dialCode.length).trim() }
    : { iso2: props.defaultCountry, national: value }
}

const initial = parse(model.value)
const selectedIso2 = ref(initial.iso2)
const nationalNumber = ref(initial.national)

const selectedCountry = computed(() => COUNTRIES.find((c) => c.iso2 === selectedIso2.value))

// Only recombines once the user actually changes the country or number —
// mounting with an existing value doesn't rewrite the model on its own.
watch([selectedIso2, nationalNumber], ([iso2, national]) => {
  const trimmed = national.trim()
  if (!trimmed) {
    model.value = ''
    return
  }
  const dialCode = COUNTRIES.find((c) => c.iso2 === iso2)?.dialCode ?? ''
  model.value = `${dialCode} ${trimmed}`.trim()
})
</script>
