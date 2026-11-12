import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export function Screen({ children, scroll = true, ...rest }: ScrollViewProps & { scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={pad}
      // iOS: inset for the keyboard so inputs and the buttons under them can still be reached.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
