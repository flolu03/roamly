import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Linking, Platform
} from 'react-native'
import axios from 'axios'
import { useTripStore } from '../store/trip.store'

interface Segment {
  origin: string
  originCity: string
  destination: string
  destinationCity: string
  departsAt: string
  arrivesAt: string
  duration: string
  flightNumber: string
  airline: string
}

interface Flight {
  id: string
  airline: string
  airlineCode: string
  flightNumber: string
  departsAt: string
  arrivesAt: string
  duration: string
  stopsCount: number
  segments: Segment[]
  pricePerPax: number
  totalPrice: number
  deepLink: string
  origin: string
  destination: string
  date: string
}

interface Leg {
  label: string
  origin: string
  destination: string
  date: string
}

function extractIata(city: string): string {
  const match = city.match(/\(([A-Z]{3})\)/)
  return match ? match[1] : city.toUpperCase().slice(0, 3)
}

function FlightSection({
  leg, flights, selectedId, onSelect, onDetail, showDate = false,
}: {
  leg: Leg
  flights: Flight[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDetail: (f: Flight) => void
  showDate?: boolean
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.legTitle}>{leg.label}</Text>
      <Text style={styles.sectionTitle}>{flights.length} Optionen · nach Preis sortiert</Text>
      {flights.map((flight, index) => (
        <TouchableOpacity
          key={`${flight.id}-${flight.date}`}
          style={[styles.card, selectedId === `${flight.id}-${flight.date}` && styles.cardSelected, index === 0 && styles.cardBest]}
          onPress={() => onDetail(flight)}
        >
          {index === 0 && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>Günstigste Option</Text>
            </View>
          )}
          {showDate && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{flight.date}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <View style={styles.airlineBadge}>
              <Text style={styles.airlineCode}>{flight.airlineCode}</Text>
            </View>
            <View style={styles.times}>
              <Text style={styles.time}>{flight.departsAt}</Text>
              <Text style={styles.timeLabel}>{leg.origin}</Text>
            </View>
            <View style={styles.arrow}>
              <Text style={styles.duration}>{flight.duration}</Text>
              <Text style={styles.arrowLine}>- - - →</Text>
              <Text style={styles.stops}>
                {flight.stopsCount === 0 ? 'Direkt' : `${flight.stopsCount} Stopp`}
              </Text>
            </View>
            <View style={styles.times}>
              <Text style={styles.time}>{flight.arrivesAt}</Text>
              <Text style={styles.timeLabel}>{leg.destination}</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.price}>{flight.pricePerPax} €</Text>
              <Text style={styles.priceLabel}>p.P.</Text>
              <Text style={styles.priceTotal}>{flight.totalPrice} € ges.</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.flightNum}>{flight.airline} · {flight.flightNumber}</Text>
            <TouchableOpacity
              style={[styles.selectSmallBtn, selectedId === `${flight.id}-${flight.date}` && styles.selectSmallBtnActive]}
              onPress={(e) => { e.stopPropagation?.(); onSelect(`${flight.id}-${flight.date}`) }}
            >
              <Text style={[styles.selectSmallText, selectedId === `${flight.id}-${flight.date}` && styles.selectSmallTextActive]}>
                {selectedId === `${flight.id}-${flight.date}` ? '✓ Gewählt' : 'Wählen'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function FlightSearchScreen({ onBack }: { onBack: () => void }) {
  const { stops, paxCount, tripType, tripMode } = useTripStore()
  const [legs, setLegs] = useState<Leg[]>([])
  const [flightsByLeg, setFlightsByLeg] = useState<Flight[][]>([])
  const [selectedByLeg, setSelectedByLeg] = useState<(string | null)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null)
  const [detailLegIndex, setDetailLegIndex] = useState<number>(0)

  useEffect(() => { loadFlights() }, [])

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  function buildManualLegs(): Leg[] {
    const twoStops = stops.length === 2
    const first = stops[0]
    const second = stops[1]

    if (twoStops) {
      const originIata = first.iataCode || extractIata(first.city)
      const destIata = second.iataCode || extractIata(second.city)
      const result: Leg[] = [{
        label: `Hinflug · ${originIata} → ${destIata}`,
        origin: originIata, destination: destIata, date: first.departureDate,
      }]
      if (tripType === 'roundtrip' && first.arrivalDate) {
        result.push({
          label: `Rückflug · ${destIata} → ${originIata}`,
          origin: destIata, destination: originIata, date: first.arrivalDate,
        })
      }
      return result
    }

    return stops.slice(0, -1).map((stop, i) => {
      const to = stops[i + 1]
      const originIata = stop.iataCode || extractIata(stop.city)
      const destIata = to.iataCode || extractIata(to.city)
      return { label: `Flug ${i + 1} · ${originIata} → ${destIata}`, origin: originIata, destination: destIata, date: stop.departureDate }
    })
  }

  async function loadFlights() {
    setIsLoading(true)
    setError(null)
    try {
      if (tripMode === 'auto') {
        await loadAutoFlights()
      } else {
        const builtLegs = buildManualLegs()
        setLegs(builtLegs)
        const results = await Promise.all(
          builtLegs.map(leg =>
            axios.get('http://localhost:3000/flight/search', {
              params: { origin: leg.origin, destination: leg.destination, date: leg.date, pax: paxCount }
            }).then(r => r.data.flights || []).catch(() => [])
          )
        )
        setFlightsByLeg(results)
        setSelectedByLeg(new Array(builtLegs.length).fill(null))
      }
    } catch {
      setError('Flüge konnten nicht geladen werden')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAutoFlights() {
    const first = stops[0]
    const startDate = first.departureDate || today

    // Kumulierte Nächte berechnen → Basisdatum pro Leg
    // Leg i: departure = startDate + Summe der Nächte aller vorherigen Zwischenstopps
    let cumulativeNights = 0
    const builtLegs: Leg[] = stops.slice(0, -1).map((stop, i) => {
      const to = stops[i + 1]
      const originIata = stop.iataCode || extractIata(stop.city)
      const destIata = to.iataCode || extractIata(to.city)
      const baseDate = addDays(startDate, cumulativeNights)
      // Nächte am AKTUELLEN Stop aufaddieren (für das nächste Leg)
      cumulativeNights += parseInt(stop.nights || '0') || 0
      return {
        label: `Flug ${i + 1} · ${originIata} → ${destIata}`,
        origin: originIata,
        destination: destIata,
        date: baseDate,
      }
    })
    setLegs(builtLegs)

    // Pro Leg: Basisdatum ±2 Tage = 5 Suchdaten
    const searchTasks: { legIdx: number; origin: string; destination: string; date: string }[] = []
    builtLegs.forEach((leg, i) => {
      for (let offset = -2; offset <= 2; offset++) {
        const date = addDays(leg.date, offset)
        if (date >= today) {
          searchTasks.push({ legIdx: i, origin: leg.origin, destination: leg.destination, date })
        }
      }
    })

    // Alle parallel suchen
    const results = await Promise.all(
      searchTasks.map(task =>
        axios.get('http://localhost:3000/flight/search', {
          params: { origin: task.origin, destination: task.destination, date: task.date, pax: paxCount }
        }).then(r => ({ legIdx: task.legIdx, flights: r.data.flights || [] }))
          .catch(() => ({ legIdx: task.legIdx, flights: [] }))
      )
    )

    // Pro Leg zusammenführen, Duplikate entfernen, nach Preis sortieren
    const flightsByLegResult = builtLegs.map((_, i) => {
      const seen = new Set<string>()
      return results
        .filter(r => r.legIdx === i)
        .flatMap(r => r.flights)
        .filter(f => {
          const key = `${f.id}-${f.date}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) => a.totalPrice - b.totalPrice)
    })

    setFlightsByLeg(flightsByLegResult)
    setSelectedByLeg(new Array(builtLegs.length).fill(null))
  }

  function openDeepLink(url: string) {
    if (Platform.OS === 'web') window.open(url, '_blank')
    else Linking.openURL(url)
  }

  const totalPrice = selectedByLeg.reduce((sum, id, i) => {
    const f = flightsByLeg[i]?.find(f => f.id === id)
    return sum + (f?.totalPrice || 0)
  }, 0)
  const allSelected = selectedByLeg.length > 0 && selectedByLeg.every(id => id !== null)

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Zurück</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {stops[0]?.iataCode || 'FRA'} → {stops[stops.length - 1]?.iataCode || '?'}
          </Text>
          <Text style={styles.headerSub}>
            {stops[0]?.departureDate || ''} · {paxCount} {paxCount === 1 ? 'Person' : 'Personen'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#BA7517" />
          <Text style={styles.loadingText}>Flüge werden gesucht...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadFlights}>
            <Text style={styles.retryText}>Nochmal versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {legs.map((leg, i) => (
              <FlightSection
                key={i}
                leg={leg}
                flights={flightsByLeg[i] || []}
                selectedId={selectedByLeg[i] || null}
                onSelect={(id) => {
                  const updated = [...selectedByLeg]
                  updated[i] = id
                  setSelectedByLeg(updated)
                }}
                onDetail={(f) => { setDetailFlight(f); setDetailLegIndex(i) }}
                showDate={tripMode === 'auto'}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>
                {allSelected ? 'Alle Flüge gewählt' : `${selectedByLeg.filter(Boolean).length} / ${legs.length} gewählt`}
              </Text>
              {totalPrice > 0 && (
                <Text style={styles.footerPrice}>{totalPrice} € gesamt</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.bookBtn, !allSelected && styles.bookBtnDisabled]}
              disabled={!allSelected}
              onPress={() => {
                const f = flightsByLeg[0]?.find(f => f.id === selectedByLeg[0])
                if (f) openDeepLink(f.deepLink)
              }}
            >
              <Text style={styles.bookBtnText}>Zur Buchung →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!detailFlight}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailFlight(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {detailFlight && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalAirlineBadge}>
                    <Text style={styles.modalAirlineCode}>{detailFlight.airlineCode}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalAirlineName}>{detailFlight.airline}</Text>
                    <Text style={styles.modalFlightNum}>{detailFlight.flightNumber}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailFlight(null)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {detailFlight.segments && detailFlight.segments.length > 1 ? (
                  <View style={styles.segmentList}>
                    {detailFlight.segments.map((seg, i) => (
                      <View key={i}>
                        <View style={styles.segmentRow}>
                          <View style={styles.modalTimeBox}>
                            <Text style={styles.modalTime}>{seg.departsAt}</Text>
                            <Text style={styles.modalAirport}>{seg.origin}</Text>
                            <Text style={styles.segmentCity}>{seg.originCity}</Text>
                          </View>
                          <View style={styles.modalArrow}>
                            <Text style={styles.modalDuration}>{seg.duration}</Text>
                            <Text style={styles.modalArrowLine}>————→</Text>
                            <Text style={styles.segmentFlightNum}>{seg.flightNumber}</Text>
                          </View>
                          <View style={styles.modalTimeBox}>
                            <Text style={styles.modalTime}>{seg.arrivesAt}</Text>
                            <Text style={styles.modalAirport}>{seg.destination}</Text>
                            <Text style={styles.segmentCity}>{seg.destinationCity}</Text>
                          </View>
                        </View>
                        {i < detailFlight.segments.length - 1 && (
                          <View style={styles.layoverRow}>
                            <View style={styles.layoverLine} />
                            <Text style={styles.layoverText}>
                              Zwischenstopp · {seg.destination}
                            </Text>
                            <View style={styles.layoverLine} />
                          </View>
                        )}
                      </View>
                    ))}
                    <Text style={styles.totalDuration}>Gesamtdauer: {detailFlight.duration}</Text>
                  </View>
                ) : (
                  <View style={styles.modalRoute}>
                    <View style={styles.modalTimeBox}>
                      <Text style={styles.modalTime}>{detailFlight.departsAt}</Text>
                      <Text style={styles.modalAirport}>{detailFlight.origin}</Text>
                      <Text style={styles.modalDate}>{detailFlight.date}</Text>
                    </View>
                    <View style={styles.modalArrow}>
                      <Text style={styles.modalDuration}>{detailFlight.duration}</Text>
                      <Text style={styles.modalArrowLine}>————→</Text>
                      <Text style={styles.modalStops}>Direktflug</Text>
                    </View>
                    <View style={styles.modalTimeBox}>
                      <Text style={styles.modalTime}>{detailFlight.arrivesAt}</Text>
                      <Text style={styles.modalAirport}>{detailFlight.destination}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalDivider} />

                <View style={styles.modalPriceRow}>
                  <View>
                    <Text style={styles.modalPriceLabel}>Pro Person</Text>
                    <Text style={styles.modalPrice}>{detailFlight.pricePerPax} €</Text>
                  </View>
                  <View style={styles.modalPriceDivider} />
                  <View>
                    <Text style={styles.modalPriceLabel}>Gesamt ({paxCount} {paxCount === 1 ? 'Person' : 'Personen'})</Text>
                    <Text style={styles.modalPriceTotal}>{detailFlight.totalPrice} €</Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => {
                      const updated = [...selectedByLeg]
                      updated[detailLegIndex] = detailFlight.id
                      setSelectedByLeg(updated)
                      setDetailFlight(null)
                    }}
                  >
                    <Text style={styles.selectBtnText}>
                      {selectedByLeg[detailLegIndex] === detailFlight.id ? '✓ Ausgewählt' : 'Flug auswählen'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookNowBtn}
                    onPress={() => openDeepLink(detailFlight.deepLink)}
                  >
                    <Text style={styles.bookNowBtnText}>Jetzt buchen →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 0.5, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { padding: 4 },
  backText: { color: '#BA7517', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { color: '#888', marginTop: 16, fontSize: 14 },
  errorText: { color: '#e74c3c', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { padding: 12, borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd' },
  retryText: { color: '#888', fontSize: 14 },
  list: { flex: 1, padding: 16 },
  legTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  sectionTitle: { fontSize: 12, color: '#888', marginBottom: 10 },
  card: { borderWidth: 0.5, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardSelected: { borderColor: '#BA7517', borderWidth: 1.5 },
  cardBest: { borderColor: '#EF9F27' },
  bestBadge: { backgroundColor: '#FAEEDA', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4 },
  bestBadgeText: { fontSize: 10, color: '#633806' },
  dateBadge: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  dateBadgeText: { fontSize: 11, fontWeight: '600', color: '#555' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  airlineBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  airlineCode: { fontSize: 10, fontWeight: '600', color: '#555' },
  times: { alignItems: 'center', minWidth: 40 },
  time: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  timeLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  arrow: { flex: 1, alignItems: 'center' },
  duration: { fontSize: 10, color: '#888' },
  arrowLine: { fontSize: 11, color: '#ccc', letterSpacing: -2 },
  stops: { fontSize: 10, color: '#888', marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '700', color: '#854F0B' },
  priceLabel: { fontSize: 10, color: '#888' },
  priceTotal: { fontSize: 10, color: '#aaa', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#f0f0f0' },
  flightNum: { fontSize: 11, color: '#aaa' },
  selectSmallBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#BA7517' },
  selectSmallBtnActive: { backgroundColor: '#BA7517' },
  selectSmallText: { fontSize: 11, fontWeight: '600', color: '#BA7517' },
  selectSmallTextActive: { color: '#fff' },
  footer: { padding: 16, borderTopWidth: 0.5, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { fontSize: 12, color: '#888' },
  footerPrice: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  bookBtn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 14, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#eee' },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalAirlineBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  modalAirlineCode: { fontSize: 13, fontWeight: '700', color: '#555' },
  modalAirlineName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  modalFlightNum: { fontSize: 12, color: '#888', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#555' },
  modalRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTimeBox: { alignItems: 'center', minWidth: 60 },
  modalTime: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  modalAirport: { fontSize: 13, fontWeight: '600', color: '#BA7517', marginTop: 2 },
  modalDate: { fontSize: 11, color: '#888', marginTop: 2 },
  modalArrow: { flex: 1, alignItems: 'center' },
  modalDuration: { fontSize: 12, color: '#888', marginBottom: 2 },
  modalArrowLine: { fontSize: 14, color: '#ddd' },
  modalStops: { fontSize: 11, color: '#888', marginTop: 2 },
  modalDivider: { height: 0.5, backgroundColor: '#eee', marginVertical: 16 },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center' },
  modalPriceLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  modalPrice: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  modalPriceDivider: { width: 0.5, height: 40, backgroundColor: '#eee', marginHorizontal: 20 },
  modalPriceTotal: { fontSize: 20, fontWeight: '700', color: '#854F0B' },
  segmentList: { marginBottom: 4 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  segmentCity: { fontSize: 10, color: '#aaa', marginTop: 2 },
  segmentFlightNum: { fontSize: 10, color: '#888', marginTop: 2 },
  layoverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  layoverLine: { flex: 1, height: 0.5, backgroundColor: '#ddd' },
  layoverText: { fontSize: 11, color: '#BA7517', fontWeight: '600' },
  totalDuration: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4 },
  modalActions: { gap: 10 },
  selectBtn: { borderWidth: 1.5, borderColor: '#BA7517', borderRadius: 10, padding: 14, alignItems: 'center' },
  selectBtnText: { color: '#BA7517', fontSize: 15, fontWeight: '600' },
  bookNowBtn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 14, alignItems: 'center' },
  bookNowBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
