import { useMemo, useState } from "react";
import { View } from "react-native";
import { colors } from "@/constants/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { applyRunningLate } from "@/lib/schedule";
import { fmtClock, fmtDuration } from "@/lib/time";

const DELAYS = [15, 30, 60, 90];

export function RunningLateSheet({ visible, onClose, date, nowMin }: { visible: boolean; onClose: () => void; date: string; nowMin: number }) {
  const { state, replaceBlocks } = useStore();
  const toast = useToast();
  const [delay, setDelay] = useState(15);

  const result = useMemo(
    () => applyRunningLate(state.blocks, date, nowMin, delay, state.settings),
    [state.blocks, state.settings, date, nowMin, delay],
  );

  const apply = () => {
    replaceBlocks(result.blocks);
    const tomorrow = result.changes.filter((c) => c.tomorrow).length;
    toast(tomorrow ? `Day shifted. ${tomorrow} moved to tomorrow` : "Day shifted");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Running late">
      <Text variant="label" style={{ marginBottom: 12 }}>How far behind are you? This never counts as a miss.</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {DELAYS.map((d) => <Chip key={d} label={fmtDuration(d)} selected={delay === d} onPress={() => setDelay(d)} />)}
      </View>

      {result.changes.length === 0 ? (
        <Text variant="body" style={{ marginBottom: 16 }}>Your buffers soak that up. Nothing needs to move.</Text>
      ) : (
        <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 12, gap: 10, marginBottom: 16 }}>
          {result.changes.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>{c.title}</Text>
              <Text variant="label">{fmtClock(c.from)} → {c.tomorrow ? "tomorrow" : fmtClock(c.to)}</Text>
              <View style={{ backgroundColor: c.tomorrow ? colors.bar : colors.accent2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text variant="caption" color={colors.ink}>{c.tomorrow ? "Tomorrow" : "Moved"}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Button label="Shift my day" onPress={apply} />
    </Sheet>
  );
}
