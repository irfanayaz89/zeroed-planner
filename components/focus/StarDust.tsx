import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/theme";

/** Tiny static dots plus a soft accent glow that breathes on a 6s loop. */
export function StarDust() {
  const { width, height } = useWindowDimensions();
  const dots = useMemo(() => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 90 }, () => ({ x: rand() * width, y: rand() * height, r: rand() * 0.9 + 0.3, o: rand() * 0.35 + 0.08 }));
  }, [width, height]);

  const breathe = useSharedValue(0.55);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);
  const glow = useAnimatedStyle(() => ({ opacity: breathe.value }));

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" opacity={d.o} />)}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, glow]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="28%" r="60%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity="0.28" />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#glow)" />
        </Svg>
      </Animated.View>
    </>
  );
}
