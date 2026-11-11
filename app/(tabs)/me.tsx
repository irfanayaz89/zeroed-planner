import { Alert, Platform, Switch, View } from "react-native";
import { colors } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { fmtClock } from "@/lib/time";
import type { Settings } from "@/lib/types";

export default function MeScreen() {
  const { state, patchSettings, resetDemo } = useStore();
  const toast = useToast();
  const s = state.settings;

  const time = (key: keyof Settings, label: string, min = 0, max = 24 * 60) => (
    <Row label={label}>
      <Stepper value={s[key] as number} step={15} min={min} max={max} format={fmtClock} label={label} onChange={(v) => patchSettings({ [key]: v })} />
    </Row>
  );

  const reset = () => {
    const go = () => {
      resetDemo();
      toast("Demo data reset");
    };
    if (Platform.OS === "web") return go();
    Alert.alert("Reset demo data?", "This replaces everything with the sample day.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: go },
    ]);
  };

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">Me</Text>

      <Section title="My day">
        {time("dayStartMin", "Day starts")}
        {time("windDownMin", "Wind-down")}
        {time("planRitualMin", "Plan ritual")}
        {time("shutdownMin", "Shutdown")}
        <Row label="Buffer">
          <Stepper value={s.bufferPct} step={5} min={0} max={50} format={(v) => `${v}%`} label="Buffer" onChange={(v) => patchSettings({ bufferPct: v })} />
        </Row>
        <Row label="Calendars">
          <Text variant="label">Coming soon</Text>
        </Row>
      </Section>

      <Section title="Discipline rules">
        <Row label="Kept if started within">
          <Stepper value={s.keptGraceMin} step={5} min={5} max={30} format={(v) => `${v}m`} label="Grace minutes" onChange={(v) => patchSettings({ keptGraceMin: v })} />
        </Row>
        <Row label="Unfinished at night">
          <Text variant="label">Ask me</Text>
        </Row>
        <Row label="Rolled over 3 times">
          <Text variant="label">Goes to inbox</Text>
        </Row>
        <Row label="Pillars">
          <Text variant="label">4 at most</Text>
        </Row>
      </Section>

      <Section title="Nudges">
        <Row label="Focus starts">
          <Text variant="label">Lock Screen only</Text>
        </Row>
        <Row label="Plan and shutdown">
          <Text variant="label">One each</Text>
        </Row>
        <Row label={`Wrap-up cue (in app, last ${s.wrapUpCueMin}m)`}>
          <Switch
            value={s.wrapUpCueMin > 0}
            onValueChange={(on) => patchSettings({ wrapUpCueMin: on ? 5 : 0 })}
            trackColor={{ true: colors.accent, false: colors.bar }}
            accessibilityLabel="Wrap-up cue"
          />
        </Row>
        <Row label="Everything else">
          <Text variant="label">Off</Text>
        </Row>
      </Section>

      <Button label="Reset demo data" tone="secondary" onPress={reset} style={{ marginTop: 24 }} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text variant="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>{title}</Text>
      <Card style={{ paddingVertical: 4 }}>{children}</Card>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: 10 }}>
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      {children}
    </View>
  );
}
