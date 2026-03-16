import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import axios from 'axios'
import { useTripStore } from '../store/trip.store'

interface Flight {
  id: string
  airline: string
  airlineCode: string
  flightNumber: string
  departsAt: string
  arrivesAt: string
  duration: string
  stopsCount: number
  pricePerPax: number
  totalPrice: number
  deepLink: string
}

export default function FlightSearchScreen({ onBack }: { onBack: () => void }) {
  const { stops, paxCount } = useTripStore()
  const [flights, setFlights] = useState<Flight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const firstStop = stops[0]
  const secondStop = stops[1]

  useEffect(() => {
    loadFlights()
  }, [])

  function extractIata(city: string): string {
    const match = city.match(/\(([A-Z]{3})\)/)
    return match ? match[1] : city.toUpperCase().slice(0, 3)
  }

  async function loadFlights() {
    setIsLoading(true)
    setError(null)
    try {
      const originIata = firstStop?.iataCode || extractIata(firstStop?.city || 'FRA')
      const destIata = secondStop?.iataCode || extractIata(secondStop?.city || 'BKK')
      const date = firstStop?.departureDate || '2026-06-01'

      const res = await axios.get('http://localhost:3000/flight/search', {
        params: {
          origin: originIata,
          destination: destIata,
          date,
          pax: paxCount
        }
      })
      setFlights(res.data.flights)
    } catch (e) {
      setError('Flüge konnten nicht geladen werden')
    } finally {
      setIsLoading(false)
    }
  }

  const totalCost = flights.reduce((acc, f) =>
    f.id === selectedId ? acc + f.totalPrice : acc, 0
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Zurück</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {firstStop?.iataCode || 'FRA'} → {secondStop?.iataCode || 'BKK'}
          </Text>
          <Text style={styles.headerSub}>
            {firstStop?.departureDate || ''} · {paxCount} {paxCount === 1 ? 'Person' : 'Personen'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#BA7517" />
          <Text style={styles.loadingText}>Günstigste Flüge werden gesucht...</Text>
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
            <Text style={styles.sectionTitle}>{flights.length} Flüge gefunden</Text>
            {flights.map((flight, index) => (
              <TouchableOpacity
                key={flight.id}
                style={[styles.card, selectedId === flight.id && styles.cardSelected, index === 0 && styles.cardBest]}
                onPress={() => setSelectedId(flight.id)}
              >
                {index === 0 && (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>Bestes Preis-Leistung</Text>
                  </View>
                )}
                <View style={styles.cardRow}>
                  <View style={styles.airlineBadge}>
                    <Text style={styles.airlineCode}>{flight.airlineCode}</Text>
                  </View>
                  <View style={styles.times}>
                    <Text style={styles.time}>{flight.departsAt}</Text>
                    <Text style={styles.timeLabel}>{firstStop?.iataCode || 'FRA'}</Text>
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
                    <Text style={styles.timeLabel}>{secondStop?.iataCode || 'BKK'}</Text>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.price}>{flight.pricePerPax} €</Text>
                    <Text style={styles.priceLabel}>p.P.</Text>
                    <Text style={styles.priceTotal}>{flight.totalPrice} € ges.</Text>
                  </View>
                </View>
                <Text style={styles.flightNum}>{flight.airline} · {flight.flightNumber}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>
                {selectedId ? 'Ausgewählt' : 'Flug auswählen'}
              </Text>
              {selectedId && (
                <Text style={styles.footerPrice}>
                  {flights.find(f => f.id === selectedId)?.totalPrice} € gesamt
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.bookBtn, !selectedId && styles.bookBtnDisabled]}
              disabled={!selectedId}
            >
              <Text style={styles.bookBtnText}>Zur Buchung →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  sectionTitle: { fontSize: 13, color: '#888', marginBottom: 12 },
  card: { borderWidth: 0.5, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardSelected: { borderColor: '#BA7517', borderWidth: 1.5 },
  cardBest: { borderColor: '#EF9F27' },
  bestBadge: { backgroundColor: '#FAEEDA', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 8 },
  bestBadgeText: { fontSize: 10, color: '#633806' },
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
  flightNum: { fontSize: 11, color: '#aaa', marginTop: 6 },
  footer: { padding: 16, borderTopWidth: 0.5, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { fontSize: 12, color: '#888' },
  footerPrice: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  bookBtn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 14, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#eee' },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' }
})