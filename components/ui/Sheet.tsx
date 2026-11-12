import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/constants/theme";
import { Text } from "./Text";
import { ToastHost } from "./Toast";

/** A bottom sheet built on Modal, so it works the same on iOS, Android and web. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Lift the sheet above the keyboard so inputs inside it stay visible on iOS. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingTop: 10,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            maxHeight: "88%",
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.bar, marginBottom: 14 }} />
          {title ? <Text variant="heading" style={{ marginBottom: 12 }}>{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
      <ToastHost />
    </Modal>
  );
}
