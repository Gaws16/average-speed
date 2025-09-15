import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

// Haversine distance in meters
export function haversineDistanceMeters(
  a: Coordinates,
  b: Coordinates
): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);

  const h =
    sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusMeters * c;
}

export function isNear(
  point: Coordinates,
  user: Coordinates | null | undefined,
  radiusMeters: number = 30
): boolean {
  if (!user) return false;
  return haversineDistanceMeters(point, user) <= radiusMeters;
}

export function computeLiveAverageKmH(
  start: Coordinates,
  current: Coordinates,
  startTimeMs: number
): number | null {
  const now = Date.now();
  const elapsedSeconds = (now - startTimeMs) / 1000;
  if (elapsedSeconds <= 0) return null;
  const distanceKm = haversineDistanceMeters(start, current) / 1000;
  const hours = elapsedSeconds / 3600;
  if (hours <= 0) return null;
  return distanceKm / hours;
}

export async function requestForegroundPermissionsAsync(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentPositionAsync() {
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

export async function watchHighAccuracyPosition(
  onPosition: (location: Location.LocationObject) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 1000,
    },
    onPosition
  );
}
