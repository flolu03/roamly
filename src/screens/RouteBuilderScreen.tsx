import React from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert
} from 'react-native'
import { useTripStore, Stop } from '../store/trip.store'
import * as Haptics from 'expo-haptics'

function StopCard({ stop, index, total }: { stop: Stop, index: number, total: number }) {
  const { updateStop, removeStop, moveStop } = useTripStore()
  const isFirst = index === 0
  const isLast = index === total - 1
  const isHome = isFirst || isLast

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
          placeholder="Stadt (z.B. Bangkok (BKK))"
          placeholderTextColor="#bbb"
          value={stop.city}
          onChangeText={(v) => {
            updateStop(stop.id, 'city', v)
            const match = v.match(/\(([A-Z]{3})\)/)
            if (match) updateStop(stop.id, 'iataCode', match[1])
          }}
          editable={!isHome}
        />
        <View style={styles.dateRow}>
          {!isFirst && (
            <TextInput
              style={styles.dateInput}
              placeholder="Ankunft (JJJJ-MM-TT)"
              placeholderTextColor="#bbb"
              value={stop.arrivalDate}
              onChangeText={(v) => updateStop(stop.id, 'arrivalDate', v)}
            />
          )}
          {!isLast && (
            <TextInput
              style={styles.dateInput}
              placeholder="Abflug (JJJJ-MM-TT)"
              placeholderTextColor="#bbb"
              value={stop.departureDate}
              onChangeText={(v) => updateStop(stop.id, 'departureDate', v)}
            />
          )}
        </View>

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
              Alert.alert('Stopp entfernen?', stop.city || 'Dieser Stopp', [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Entfernen', style: 'destructive', onPress: () => removeStop(stop.id) }
              ])
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
  const { stops, tripTitle, paxCount, addStop, setTripTitle, setPaxCount } = useTripStore()

  const nights = stops.reduce((acc, s, i) => {
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
  cityInput: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, color: '#1a1a1a', marginBottom: 6 },
  dateRow: { flexDirection: 'row', gap: 6 },
  dateInput: { flex: 1, borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 8, fontSize: 12, color: '#1a1a1a' },
  stopActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  actionBtnDelete: { borderColor: '#ffcccc' },
  actionText: { fontSize: 14, color: '#888' },
  actionTextDelete: { fontSize: 12, color: '#e74c3c' },
  addBtn: { paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#BA7517', fontSize: 14, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: 0.5, borderColor: '#eee' },
  searchBtn: { backgroundColor: '#BA7517', borderRadius: 10, padding: 15, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})