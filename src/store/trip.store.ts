import { create } from 'zustand'

export interface Stop {
  id: string
  city: string
  iataCode: string
  arrivalDate: string
  departureDate: string
}

interface TripStore {
  stops: Stop[]
  tripTitle: string
  paxCount: number
  setTripTitle: (title: string) => void
  setPaxCount: (count: number) => void
  addStop: () => void
  removeStop: (id: string) => void
  updateStop: (id: string, field: keyof Stop, value: string) => void
  moveStop: (fromIndex: number, toIndex: number) => void
  resetTrip: () => void
}

const defaultStops: Stop[] = [
  { id: '1', city: 'Frankfurt (FRA)', iataCode: 'FRA', arrivalDate: '', departureDate: '2025-11-01' },
  { id: '2', city: '', iataCode: '', arrivalDate: '2025-11-01', departureDate: '' },
  { id: '3', city: 'Frankfurt (FRA)', iataCode: 'FRA', arrivalDate: '', departureDate: '' },
]

export const useTripStore = create<TripStore>((set) => ({
  stops: defaultStops,
  tripTitle: 'Meine Rundreise',
  paxCount: 1,

  setTripTitle: (title) => set({ tripTitle: title }),
  setPaxCount: (count) => set({ paxCount: count }),

  addStop: () => set((state) => {
    const lastStop = state.stops[state.stops.length - 1]
    const newStop: Stop = {
      id: Date.now().toString(),
      city: '',
      iataCode: '',
      arrivalDate: '',
      departureDate: '',
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