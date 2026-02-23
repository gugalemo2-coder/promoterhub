// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // Promoter tabs
  "clock.fill": "access-time",
  "camera.fill": "photo-camera",
  "cube.box.fill": "inventory",
  "doc.fill": "description",
  // Manager tabs
  "chart.bar.fill": "bar-chart",
  "person.3.fill": "group",
  "bell.fill": "notifications",
  "gear": "settings",
  // Common
  "location.fill": "location-on",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "plus.circle.fill": "add-circle",
  "arrow.up.circle.fill": "upload",
  "arrow.down.circle.fill": "download",
  "photo.fill": "photo",
  "tag.fill": "label",
  "star.fill": "star",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "person.fill": "person",
  "briefcase.fill": "work",
  "map.fill": "map",
  "magnifyingglass": "search",
  "line.3.horizontal.decrease.circle": "filter-list",
  "storefront.fill": "storefront",
  "chart.line.uptrend.xyaxis": "trending-up",
  "chart.pie.fill": "pie-chart",
  "bell.badge.fill": "notifications-active",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
