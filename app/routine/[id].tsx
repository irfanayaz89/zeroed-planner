import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

export default function Placeholder() {
  const router = useRouter();
  return (
    <Screen>
      <Text variant="title">Routine runner</Text>
      <Text variant="label" style={{ marginVertical: 12 }}>Coming in the next PR.</Text>
      <Button label="Back" tone="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
