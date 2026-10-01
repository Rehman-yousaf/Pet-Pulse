import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import type { VetPlace } from '@/src/services/mapsService';
import { searchNearbyVets } from '@/src/services/mapsService';

const ORANGE = '#FF7A00';
const BACKGROUND = '#f5f5f5';

const DEFAULT_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

/** Approximate distance in km between two points (Haversine). */
function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type VetWithDistance = VetPlace & { distance: number };

function openGoogleMaps(vet: VetWithDistance): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${vet.latitude},${vet.longitude}`;
  Linking.openURL(url);
}

const VetCard = ({
  vet,
  colors,
}: {
  vet: VetWithDistance;
  colors: { primary: string; text: string; grey: string };
}) => (
  <TouchableOpacity
    style={styles.vetCard}
    onPress={() => openGoogleMaps(vet)}
    activeOpacity={0.7}
  >
    <View>
      <Text style={[styles.vetName, { color: colors.text }]} numberOfLines={2}>
        {vet.name}
      </Text>
      <Text style={[styles.vetDistance, { color: ORANGE }]}>
        {vet.distance.toFixed(1)} km away
      </Text>
      {vet.vicinity ? (
        <Text style={[styles.vetVicinity, { color: colors.grey }]} numberOfLines={1}>
          {vet.vicinity}
        </Text>
      ) : null}
    </View>
    <Ionicons name="navigate" size={22} color={ORANGE} />
  </TouchableOpacity>
);

export default function MapScreen() {
  const { colors } = useTheme();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [vets, setVets] = useState<VetPlace[]>([]);
  const [topVets, setTopVets] = useState<VetWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchLocationAndVets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      const results = await searchNearbyVets(latitude, longitude);
      setVets(results);

      const withDistance: VetWithDistance[] = results.map((vet) => ({
        ...vet,
        distance: getDistanceKm(latitude, longitude, vet.latitude, vet.longitude),
      }));
      const sorted = withDistance.sort((a, b) => a.distance - b.distance);
      setTopVets(sorted.slice(0, 3));

      if (results.length > 0 && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load vets';
      setError(msg);
      setVets([]);
      setTopVets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationAndVets();
  }, [fetchLocationAndVets]);

  const region = location
    ? {
        ...location,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : DEFAULT_REGION;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]} edges={['top']}>
      {loading && !location ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={[styles.loadingText, { color: colors.grey }]}>
            Getting location and nearby vets...
          </Text>
        </View>
      ) : error && vets.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="warning" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: ORANGE }]}
            onPress={fetchLocationAndVets}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              showsUserLocation
              showsMyLocationButton={Platform.OS !== 'ios'}
            >
              {vets.map((vet) => (
                <Marker
                  key={vet.id}
                  coordinate={{ latitude: vet.latitude, longitude: vet.longitude }}
                  title={vet.name}
                  description={vet.vicinity + (vet.rating != null ? ` • ${vet.rating}★` : '')}
                  pinColor={ORANGE}
                />
              ))}
            </MapView>
          </View>

          <View style={styles.bottomContainer}>
            <View style={styles.bottomHeader}>
              <Text style={styles.bottomTitle}>Nearest vets</Text>
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: ORANGE }]}
                onPress={fetchLocationAndVets}
                disabled={loading}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            {topVets.length === 0 ? (
              <Text style={[styles.noVets, { color: colors.grey }]}>
                No nearby vets found. Try refreshing.
              </Text>
            ) : (
              topVets.map((vet) => <VetCard key={vet.id} vet={vet} colors={colors} />)
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorText: { marginTop: 12, textAlign: 'center', fontSize: 16 },
  retryBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryText: { fontWeight: 'bold', color: '#fff' },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  noVets: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  vetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  vetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vetDistance: {
    fontSize: 13,
    marginTop: 4,
  },
  vetVicinity: {
    fontSize: 12,
    marginTop: 2,
  },
});
