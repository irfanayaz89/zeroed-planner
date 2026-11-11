/** Countdown digits that roll: each old digit slides up and fades, the new one slides in from below. */
import { useRef } from "react";
import { View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { colors, fonts } from "@/constants/theme";
import { Text } from "@/components/ui/Text";

const EASE = Easing.bezier(0.33, 1, 0.68, 1);
const enter = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 20 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
}).duration(200);
const exit = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: -20 }], easing: EASE },
}).duration(200);

const SIZE = 78;
const H = Math.round(SIZE * 1.12);
const W = Math.round(SIZE * 0.62);

function Digit({ value }: { value: string }) {
  const mounted = useRef(false);
  const entering = mounted.current ? enter : undefined;
  mounted.current = true;
  return (
    <View style={{ width: W, height: H, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <Animated.View key={value} entering={entering} exiting={exit} style={{ position: "absolute" }}>
        <Text style={{ fontFamily: fonts.displayLight, fontSize: SIZE, lineHeight: H, color: colors.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      </Animated.View>
    </View>
  );
}

function Unit({ value, label, sep }: { value: number; label: string; sep: boolean }) {
  const s = String(value).padStart(2, "0");
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Digit value={s[0]} />
        <Digit value={s[1]} />
        {sep ? <Text style={{ fontFamily: fonts.displayLight, fontSize: SIZE * 0.6, color: colors.soft, marginHorizontal: 2 }}>:</Text> : null}
      </View>
      <Text variant="caption" style={{ marginTop: 2, marginRight: sep ? 14 : 0 }}>{label}</Text>
    </View>
  );
}

export function RollingDigits({ seconds, title }: { seconds: number; title: string }) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  // Speak at most every 30 seconds so screen readers aren't flooded.
  const bucket = Math.floor(s / 30) * 30;
  const spoken = `${Math.floor(bucket / 60)} minutes left in ${title}`;
  return (
    <View accessible accessibilityLabel={spoken} style={{ alignItems: "center" }}>
      <Text variant="eyebrow" color={colors.soft} style={{ marginBottom: 4 }}>Ends in</Text>
      <View style={{ flexDirection: "row" }}>
        {h > 0 ? <Unit value={h} label="H" sep /> : null}
        <Unit value={m} label="M" sep />
        <Unit value={sec} label="S" sep={false} />
      </View>
    </View>
  );
}
