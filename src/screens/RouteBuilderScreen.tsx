import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import axios from 'axios'
import { useTripStore, Stop } from '../store/trip.store'
import * as Haptics from 'expo-haptics'

const API_URL = 'http://localhost:3000'

interface PlaceSuggestion {
  id: string
  name: string
  city_name?: string
  iata_code: string
  type: string
}

const today = new Date().toISOString().split('T')[0]

function DateInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const displayValue = value || today
  const dateValue = new Date(displayValue)

  // Setze heute als Standard beim ersten Render
  React.useEffect(() => {
    if (!value) onChange(today)
  }, [])

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value: displayValue,
      min: today,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        flex: 1,
        border: '0.5px solid #ddd',
        borderRadius: 8,
        padding: 8,
        fontSize: 12,
        color: '#1a1a1a',
        outline: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer',
      },
    })
  }

  return (
    <>
      <TouchableOpacity style={styles.dateInput} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateValue}>{displayValue}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowPicker(false)
            if (date) onChange(date.toISOString().split('T')[0])
          }}
        />
      )}
    </>
  )
}

function StopCard({ stop, index, total }: { stop: Stop; index: number; total: number }) {
  const { updateStop, removeStop, moveStop, tripType } = useTripStore()
  const isFirst = index === 0
  const isLast = index === total - 1
  const isHome = isFirst || isLast
  const twoStops = total === 2

  // Datumslogik:
  // - Hinflug (oneway): erster Stop nur Abflug, mittlere Ankunft+Abflug, letzter nichts
  // - Hin+Rückflug (roundtrip) mit 2 Stops: erster zeigt Abflug + Rückkunft, letzter nichts
  // - Roundtrip mit 3+ Stops: wie oneway (multi-city)
  const showDeparture = !isLast
  const showArrival = twoStops && tripType === 'roundtrip' && isFirst

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const debounceRef = useRef<any>(null)

  async function fetchSuggestions(query: string) {
    if (query.length < 2) { setSuggestions([]); return }
    try {
      const res = await axios.get(`${API_URL}/places/search`, { params: { query } })
      setSuggestions(res.data.data || [])
    } catch {
      setSuggestions([])
    }
  }

  function handleCityChange(text: string) {
    updateStop(stop.id, 'city', text)
    const match = text.match(/\(([A-Z]{3})\)/)
    if (match) updateStop(stop.id, 'iataCode', match[1])
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350)
  }

  function selectSuggestion(s: PlaceSuggestion) {
    const label = `${s.city_name || s.name} (${s.iata_code})`
    updateStop(stop.id, 'city', label)
    updateStop(stop.id, 'iataCode', s.iata_code)
    setSuggestions([])
  }

  return (
    <View style={styles.stopCard}>
      <View style={styles.stopLeft}>
        <View style={[styles.stopDot, isHome && styles.stopDotHome]}>
          <Text style={[styles.stopDotText, isHome && styles.stopDotTextHome]}>
            {isHome ? '✦' : index}
          </Text>
        </View>
        {!isLast && <View style={styles.stopLine} />}
      </View>

      <View style={styles.stopRight}>
        <TextInput
          style={styles.cityInput}
          placeholder="Stadt suchen..."
          placeholderTextColor="#bbb"
          value={stop.city}
          onChangeText={handleCityChange}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.slice(0, 5).map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.suggestionItem}
                onPress={() => selectSuggestion(s)}
              >
                <Text style={styles.suggestionName}>{s.city_name || s.name}</Text>
                <Text style={styles.suggestionCode}>{s.iata_code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(showDeparture || showArrival) && (
          <View style={styles.dateRow}>
            {showArrival && (
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>{twoStops && isFirst ? 'Rückkunft' : 'Ankunft'}</Text>
                <DateInput
                  value={stop.arrivalDate || ''}
                  onChange={(v) => updateStop(stop.id, 'arrivalDate', v)}
                />
              </View>
            )}
            {showDeparture && (
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>Abflug</Text>
                <DateInput
                  value={stop.departureDate || ''}
                  onChange={(v) => updateStop(stop.id, 'departureDate', v)}
                />
              </View>
            )}
          </View>
        )}

        {!isHome && (
          <View style={styles.stopActions}>
            {index > 1 && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(); moveStop(index, index - 1) }} style={styles.actionBtn}>
                <Text style={styles.actionText}>↑</Text>
              </TouchableOpacity>
            )}
            {index < total - 2 && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(); moveStop(index, index + 1) }} style={styles.actionBtn}>
                <Text style={styles.actionText}>↓</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync()
              if (Platform.OS === 'web') {
                if (window.confirm(`Stopp "${stop.city || 'Dieser Stopp'}" entfernen?`)) removeStop(stop.id)
              } else {
                Alert.alert('Stopp entfernen?', stop.city || 'Dieser Stopp', [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Entfernen', style: 'destructive', onPress: () => removeStop(stop.id) }
                ])
              }
            }} style={[styles.actionBtn, styles.actionBtnDelete]}>
              <Text style={styles.actionTextDelete}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

export default function RouteBuilderScreen({ onSearch }: { onSearch: () => void }) {
  const { stops, tripTitle, paxCount, tripType, addStop, setTripTitle, setPaxCount, setTripType } = useTripStore()

  const nights = stops.reduce((acc, s) => {
    if (s.arrivalDate && s.departureDate) {
      const diff = (new Date(s.departureDate).getTime() - new Date(s.arrivalDate).getTime()) / 86400000
      return acc + (diff > 0 ? diff : 0)
    }
    return acc
  }, 0)

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={tripTitle}
          onChangeText={setTripTitle}
          placeholder="Reisename"
          placeholderTextColor="#bbb"
        />

        <View style={styles.tripTypeRow}>
          <TouchableOpacity
            style={[styles.tripTypeBtn, tripType === 'oneway' && styles.tripTypeBtnActive]}
            onPress={() => setTripType('oneway')}
          >
            <Text style={[styles.tripTypeBtnText, tripType === 'oneway' && styles.tripTypeBtnTextActive]}>
              Hinflug
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tripTypeBtn, tripType === 'roundtrip' && styles.tripTypeBtnActive]}
            onPress={() => setTripType('roundtrip')}
          >
            <Text style={[styles.tripTypeBtnText, tripType === 'roundtrip' && styles.tripTypeBtnTextActive]}>
              Hin- & Rückflug
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paxRow}>
          <Text style={styles.paxLabel}>Personen:</Text>
          <TouchableOpacity onPress={() => setPaxCount(Math.max(1, paxCount - 1))} style={styles.paxBtn}>
            <Text style={styles.paxBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.paxCount}>{paxCount}</Text>
          <TouchableOpacity onPress={() => setPaxCount(Math.min(9, paxCount + 1))} style={styles.paxBtn}>
            <Text style={styles.paxBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stops.length - 2}</Text>
          <Text style={styles.statLbl}>Stopps</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{nights}</Text>
          <Text style={styles.statLbl}>Nächte</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxAccent]}>
          <Text style={styles.statValAccent}>ab ~489€</Text>
          <Text style={styles.statLblAccent}>geschätzt</Text>
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {stops.map((stop, i) => (
          <StopCard key={stop.id} stop={stop} index={i} total={stops.length} />
        ))}
        {stops.length < 7 && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { Haptics.impactAsync(); addStop() }}>
            <Text style={styles.addBtnText}>+ Zwischenstopp hinzufügen</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Flüge suchen →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 0.5, borderColor: '#eee' },
  titleInput: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  tripTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tripTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  tripTypeBtnActive: { backgroundColor: '#BA7517', borderColor: '#BA7517' },
  tripTypeBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tripTypeBtnTextActive: { color: '#fff' },
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paxLabel: { fontSize: 14, color: '#888' },
  paxBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  paxBtnText: { fontSize: 18, color: '#1a1a1a', lineHeight: 22 },
  paxCount: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#eee' },
  statBoxAccent: { backgroundColor: '#FAEEDA', borderColor: '#FAC775' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  statValAccent: { fontSize: 16, fontWeight: '700', color: '#854F0B' },
  statLblAccent: { fontSize: 11, color: '#854F0B', marginTop: 2 },
  list: { flex: 1, padding: 16 },
  stopCard: { flexDirection: 'row', marginBottom: 4 },
  stopLeft: { width: 32, alignItems: 'center' },
  stopDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FAEEDA', borderWidth: 2, borderColor: '#BA7517', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stopDotHome: { backgroundColor: '#BA7517' },
  stopDotText: { fontSize: 11, fontWeight: '600', color: '#633806' },
  stopDotTextHome: { color: '#fff' },
  stopLine: { flex: 1, width: 2, backgroundColor: '#eee', marginTop: 2 },
  stopRight: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  cityInput: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, color: '#1a1a1a', marginBottom: 4 },
  suggestionsBox: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginBottom: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  suggestionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  suggestionName: { fontSize: 13, color: '#1a1a1a', flex: 1 },
  suggestionCode: { fontSize: 12, fontWeight: '700', color: '#BA7517', marginLeft: 8 },
  dateRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  dateInput: { flex: 1, borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 8, fontSize: 12, color: '#1a1a1a', justifyContent: 'center' },
  dateValue: { fontSize: 12, color: '#1a1a1a' },
  datePlaceholder: { fontSize: 12, color: '#bbb' },
  stopActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  actionBtnDelete: { borderColor: '#ffcccc' },
  actionText: { fontSize: 14, color: '#888' },
  actionTextDelete: { fontSize: 12, color: '#e74c3c' },
  addBtn: { paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#BA7517', fontSize: 14, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: 0.5, borderColor: '#eee' },
  searchBtn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 15, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
