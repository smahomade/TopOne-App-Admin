import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'

// A copy of components/PhoneField.tsx in the customer app (TopOne-App-Guest),
// so staff and customer numbers are typed and shown the same way. Change both
// together.

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'US', name: 'United States',  dial: '+1'  },
  { code: 'CA', name: 'Canada',         dial: '+1'  },
  { code: 'AU', name: 'Australia',      dial: '+61' },
  { code: 'AE', name: 'UAE',            dial: '+971'},
  { code: 'NG', name: 'Nigeria',        dial: '+234'},
  { code: 'GH', name: 'Ghana',          dial: '+233'},
  { code: 'ZA', name: 'South Africa',   dial: '+27' },
  { code: 'IN', name: 'India',          dial: '+91' },
  { code: 'PK', name: 'Pakistan',       dial: '+92' },
  { code: 'FR', name: 'France',         dial: '+33' },
  { code: 'DE', name: 'Germany',        dial: '+49' },
  { code: 'IT', name: 'Italy',          dial: '+39' },
  { code: 'ES', name: 'Spain',          dial: '+34' },
  { code: 'PT', name: 'Portugal',       dial: '+351'},
  { code: 'NL', name: 'Netherlands',    dial: '+31' },
  { code: 'BE', name: 'Belgium',        dial: '+32' },
  { code: 'PL', name: 'Poland',         dial: '+48' },
  { code: 'RO', name: 'Romania',        dial: '+40' },
  { code: 'TR', name: 'Turkey',         dial: '+90' },
  { code: 'BR', name: 'Brazil',         dial: '+55' },
  { code: 'MX', name: 'Mexico',         dial: '+52' },
  { code: 'JP', name: 'Japan',          dial: '+81' },
  { code: 'KR', name: 'South Korea',    dial: '+82' },
  { code: 'CN', name: 'China',          dial: '+86' },
  { code: 'SG', name: 'Singapore',      dial: '+65' },
  { code: 'NZ', name: 'New Zealand',    dial: '+64' },
  { code: 'IE', name: 'Ireland',        dial: '+353'},
  { code: 'SE', name: 'Sweden',         dial: '+46' },
  { code: 'NO', name: 'Norway',         dial: '+47' },
]

type Props = {
  value: string
  onChangePhone: (full: string) => void
  OtherStyles?: string
  hasError?: boolean
}

// People type numbers the way they dial them at home, e.g. 07700 900123. The
// leading 0 is a national prefix that's dropped after the country code
// (+447700900123); keeping it gives a number that can't be dialled. Italy is
// the exception, where the 0 stays.
const toInternational = (country: typeof COUNTRIES[0], digits: string) =>
  `${country.dial}${country.code === 'IT' ? digits : digits.replace(/^0+/, '')}`

/** A whole number as this field reports it: +, country code and number, e.g. +447700900123. */
export const isFullPhoneNumber = (value: string) => /^\+\d{8,15}$/.test(value)

// Splits a saved number back into its country and the rest, so a number shown
// again (on the Profile tab) gets its flag. Longer country codes are tried
// first, so one can't be mistaken for a shorter code it starts with; +1 shows
// the US flag, as Canada shares it. Anything not in international form, like
// an old "07700 900123", is shown as typed under the UK.
const fromSaved = (value: string) => {
  const trimmed = value.trim()

  if (/^(\+|00)/.test(trimmed)) {
    const digits = trimmed.replace(/[^0-9]/g, '').replace(/^00/, '')
    const country = [...COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((candidate) => digits.startsWith(candidate.dial.slice(1)))

    if (country) {
      return { country, localNumber: digits.slice(country.dial.length - 1) }
    }
  }

  return { country: COUNTRIES[0], localNumber: trimmed.replace(/[^0-9]/g, '') }
}

const PhoneField = ({ value, onChangePhone, OtherStyles = '', hasError = false }: Props) => {
  const [selected, setSelected] = useState(() => fromSaved(value).country)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [localNumber, setLocalNumber] = useState(() => fromSaved(value).localNumber)

  // The number this field last reported. When `value` comes back as that, it's
  // the screen echoing what was typed; anything else (a saved number that has
  // just loaded) is shown in the field.
  const lastReported = useRef(value)

  useEffect(() => {
    if (value === lastReported.current) {
      return
    }

    lastReported.current = value
    const saved = fromSaved(value)
    setSelected(saved.country)
    setLocalNumber(saved.localNumber)
  }, [value])

  const report = (full: string) => {
    lastReported.current = full
    onChangePhone(full)
  }

  const handleNumberChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '')
    setLocalNumber(digits)
    report(toInternational(selected, digits))
  }

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelected(country)
    setPickerVisible(false)
    report(toInternational(country, localNumber))
  }

  const getFlagEmoji = (code: string) => {
    return code
      .toUpperCase()
      .split('')
      .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join('')
  }

  return (
    <View style={{ marginTop: OtherStyles ? 20 : 0 }}>
      <View className="flex-row items-center">
        <Text className="text-base font-pmedium text-muted">Phone Number</Text>
        <Text className="ml-1 text-base font-psemibold text-[#B3261E]">*</Text>
      </View>

      <View
        style={{ marginTop: 8 }}
        className={`border-2 w-full h-14 rounded-2xl items-center flex-row overflow-hidden ${hasError ? 'border-[#B3261E] bg-[#FBEAE8]' : 'border-line bg-card'}`}
      >
        {/* Country picker button */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            borderRightWidth: 1,
            borderRightColor: '#D5CDC2',
            height: '100%',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 20 }}>{getFlagEmoji(selected.code)}</Text>
          <Text style={{ color: '#3F3A35', fontSize: 13, fontFamily: 'DMSans-SemiBold' }}>
            {selected.dial}
          </Text>
          <Text style={{ color: '#8A8178', fontSize: 11 }}>▾</Text>
        </TouchableOpacity>

        {/* Number input */}
        <TextInput
          style={{ flex: 1, paddingHorizontal: 12, color: '#1A1817', fontFamily: 'DMSans-SemiBold', fontSize: 15 }}
          value={localNumber}
          onChangeText={handleNumberChange}
          placeholder="Enter your number"
          placeholderTextColor="#8A8178"
          keyboardType="phone-pad"
        />
      </View>

      {/* Country picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 32,
              maxHeight: '70%',
            }}
          >
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: '#D5CDC2', alignSelf: 'center', marginBottom: 16 }} />

            <Text style={{ color: '#3F3A35', fontSize: 16, fontFamily: 'DMSans-SemiBold', paddingHorizontal: 20, marginBottom: 12 }}>
              Select country
            </Text>

            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCountrySelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    gap: 12,
                    backgroundColor: item.code === selected.code ? '#EDE8E1' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{getFlagEmoji(item.code)}</Text>
                  <Text style={{ flex: 1, color: '#3F3A35', fontSize: 14, fontFamily: 'DMSans-Regular' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: '#8A8178', fontSize: 13, fontFamily: 'DMSans-SemiBold' }}>
                    {item.dial}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export default PhoneField