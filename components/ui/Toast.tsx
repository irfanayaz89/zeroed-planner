import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { colors, radius } from "@/constants/theme";
import { Text } from "./Text";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 110, alignItems: "center" }}>
          <Animated.View
            entering={FadeInDown}
            exiting={FadeOutDown}
            accessibilityLiveRegion="polite"
            style={{ backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18 }}
          >
            <Text variant="bodyBold" color={colors.bg}>{msg}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
