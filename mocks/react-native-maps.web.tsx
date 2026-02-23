/**
 * Web mock for react-native-maps.
 * react-native-maps uses native components that don't exist on web.
 * This mock renders a placeholder so the web preview works correctly.
 * On iOS/Android devices, the real react-native-maps is used.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

// ─── MapView ─────────────────────────────────────────────────────────────────
function MapView({
  children,
  style,
  onPress,
}: {
  children?: React.ReactNode;
  style?: any;
  onPress?: (e: { nativeEvent: { coordinate: Coordinate } }) => void;
  initialRegion?: Region;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  ref?: any;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPress) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Simulate a coordinate based on click position (rough approximation)
    const latitude = -23.5505 + (y / rect.height - 0.5) * -0.1;
    const longitude = -46.6333 + (x / rect.width - 0.5) * 0.1;
    onPress({ nativeEvent: { coordinate: { latitude, longitude } } });
  };

  return (
    <View style={[styles.container, style]}>
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: onPress ? "crosshair" : "default", width: "100%", height: "100%" }}
        onClick={handleClick as any}
      >
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Mapa Interativo</Text>
        <Text style={styles.subtitle}>
          {onPress ? "Clique para selecionar a localização" : "Disponível no app iOS/Android"}
        </Text>
        {children}
      </div>
    </View>
  );
}

MapView.Animated = MapView;

// ─── Marker ──────────────────────────────────────────────────────────────────
function Marker({ title, coordinate }: { title?: string; coordinate?: Coordinate; pinColor?: string; children?: React.ReactNode }) {
  if (!coordinate) return null;
  return (
    <View style={styles.markerContainer}>
      <Text style={styles.markerPin}>📍</Text>
      {title && <Text style={styles.markerTitle}>{title}</Text>}
    </View>
  );
}

// ─── Circle ──────────────────────────────────────────────────────────────────
function Circle(_props: { center?: Coordinate; radius?: number; strokeColor?: string; fillColor?: string; strokeWidth?: number }) {
  return null;
}

// ─── Polyline / Polygon ──────────────────────────────────────────────────────
function Polyline(_props: any) { return null; }
function Polygon(_props: any) { return null; }
function Callout(_props: any) { return null; }

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F4FD", borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "700", color: "#1E3A5F", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", paddingHorizontal: 20 },
  markerContainer: { alignItems: "center" },
  markerPin: { fontSize: 24 },
  markerTitle: { fontSize: 11, color: "#1E3A5F", fontWeight: "600" },
});

export default MapView;
export { Marker, Circle, Polyline, Polygon, Callout };
export type { Region };
