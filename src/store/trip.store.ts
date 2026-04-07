import { create } from 'zustand'

export interface Stop {
  id: string
  city: string
  iataCode: string
  arrivalDate: string
  departureDate: string
  nights: string
}

interface TripStore {
  stops: Stop[]
  tripTitle: string
  paxCount: number
  tripType: 'oneway' | 'roundtrip'
  tripMode: 'manual' | 'auto'
  setTripTitle: (title: string) => void
  setPaxCount: (count: number) => void
  setTripType: (type: 'oneway' | 'roundtrip') => void
  setTripMode: (mode: 'manual' | 'auto') => void
  addStop: () => void
  removeStop: (id: string) => void
  updateStop: (id: string, field: keyof Stop, value: string) => void
  moveStop: (fromIndex: number, toIndex: number) => void
  resetTrip: () => void
}

const defaultStops: Stop[] = [
  { id: '1', city: 'Frankfurt (FRA)', iataCode: 'FRA', arrivalDate: '', departureDate: '', nights: '' },
  { id: '2', city: '', iataCode: '', arrivalDate: '', departureDate: '', nights: '' },
  { id: '3', city: 'Frankfurt (FRA)', iataCode: 'FRA', arrivalDate: '', departureDate: '', nights: '' },
]

export const useTripStore = create<TripStore>((set) => ({
  stops: defaultStops,
  tripTitle: 'Meine Rundreise',
  paxCount: 1,
  tripType: 'roundtrip',
  tripMode: 'manual',

  setTripTitle: (title) => set({ tripTitle: title }),
  setPaxCount: (count) => set({ paxCount: count }),
  setTripType: (type) => set({ tripType: type }),
  setTripMode: (mode) => set({ tripMode: mode }),

  addStop: () => set((state) => {
    const lastStop = state.stops[state.stops.length - 1]
    const newStop: Stop = {
      id: Date.now().toString(),
      city: '',
      iataCode: '',
      arrivalDate: '',
      departureDate: '',
      nights: '',
    }
    const stops = [...state.stops]
    stops.splice(stops.length - 1, 0, newStop)
    return { stops }
  }),

  removeStop: (id) => set((state) => ({
    stops: state.stops.filter((s) => s.id !== id)
  })),

  updateStop: (id, field, value) => set((state) => ({
    stops: state.stops.map((s) => s.id === id ? { ...s, [field]: value } : s)
  })),

  moveStop: (fromIndex, toIndex) => set((state) => {
    const stops = [...state.stops]
    const [moved] = stops.splice(fromIndex, 1)
    stops.splice(toIndex, 0, moved)
    return { stops }
  }),

  resetTrip: () => set({ stops: defaultStops, tripTitle: 'Meine Rundreise' })
}))