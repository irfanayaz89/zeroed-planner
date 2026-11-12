/**
 * Semicircle progress arc: dashed track, glowing elapsed arc, an 18-segment
 * comet tail behind a white-core orb with a pulsing halo, a horizon line and
 * ticks at the ends and middle.
 */
import { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function point(cx: number, cy: number, r: number, t: number) {
  const th = Math.PI * (1 - Math.min(1, Math.max(0, t)));
  return { x: cx + r * Math.cos(th), y: cy - r * Math.sin(th) };
}

function arc(cx: number, cy: number, r: number, t0: number, t1: number) {
  if (t1 <= t0 + 0.0005) return "";
  const a = point(cx, cy, r, t0);
  const b = point(cx, cy, r, t1);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

export function CometArc({ width, progress, color }: { width: number; progress: number; color: string }) {
  const p = Math.min(1, Math.max(0, progress));
  const r = width * 0.42;
  const cx = width / 2;
  const cy = r + 24;
  const height = cy + 8;
  const orb = point(cx, cy, r, p);

  const halo = useSharedValue(10);
  useEffect(() => {
    halo.value = withRepeat(withTiming(16, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [halo]);
  const haloProps = useAnimatedProps(() => ({ r: halo.value, opacity: 0.55 - (halo.value - 10) / 20 }));

  const TAIL = 18;
  const tailLen = Math.min(p, 0.22);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.45" stopColor={color} stopOpacity="0.9" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* horizon */}
        <Line x1={cx - r - 14} y1={cy} x2={cx + r + 14} y2={cy} stroke={colors.ink} strokeOpacity={0.07} strokeWidth={1} />
        {/* ticks at both ends and the midpoint */}
        {[0, 0.5, 1].map((t) => {
          const a = point(cx, cy, r - 9, t);
          const b = point(cx, cy, r + 9, t);
          return <Line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.ink} strokeOpacity={0.25} strokeWidth={1.5} />;
        })}
        {/* dashed track */}
        <Path d={arc(cx, cy, r, 0, 1)} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2} strokeDasharray="3 7" fill="none" />
        {/* glow + elapsed */}
        <Path d={arc(cx, cy, r, 0, p)} stroke={color} strokeOpacity={0.22} strokeWidth={12} strokeLinecap="round" fill="none" />
        <Path d={arc(cx, cy, r, 0, p)} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* comet tail */}
        {Array.from({ length: TAIL }, (_, i) => {
          const t1 = p - (tailLen * i) / TAIL;
          const t0 = p - (tailLen * (i + 1)) / TAIL;
          return (
            <Path
              key={i}
              d={arc(cx, cy, r, Math.max(0, t0), Math.max(0, t1))}
              stroke="#FFFFFF"
              strokeOpacity={0.55 * (1 - i / TAIL)}
              strokeWidth={4 * (1 - i / TAIL) + 1}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        {/* orb */}
        <AnimatedCircle cx={orb.x} cy={orb.y} fill={color} animatedProps={haloProps} />
        <Circle cx={orb.x} cy={orb.y} r={10} fill="url(#orb)" />
        <Circle cx={orb.x} cy={orb.y} r={3.5} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

/** Arc colour and status line by progress. */
export function arcPhase(p: number): { color: string; label: string } {
  if (p < 0.1) return { color: "#8A8B91", label: "Settling in..." };
  if (p < 0.6) return { color: colors.accent, label: "Focused" };
  if (p < 0.8) return { color: colors.sub, label: "Locked in" };
  return { color: colors.good, label: "Almost there!" };
}
