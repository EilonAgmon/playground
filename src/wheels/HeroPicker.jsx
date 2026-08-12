import { useState } from "react";
import { Stack, Title, Text, SimpleGrid, Card, Button } from "@mantine/core";
import { HERO_LIST } from "./heroes.js";
import { HeroGlyph } from "./WheelIcons.jsx";

function PickerColumn({ label, heroes, selected, onSelect, exclude }) {
  return (
    <Stack gap={6} className="pickerColumn">
      <Text className="pickerColLabel">{label}</Text>
      <SimpleGrid cols={3} spacing={6}>
        {heroes.map((h) => (
          <Card
            key={h.key}
            withBorder
            padding={6}
            className={`pickerCard ${selected === h.key ? "picked" : ""}`}
            onClick={() => exclude !== h.key && onSelect(h.key)}
            style={{ opacity: exclude === h.key ? 0.3 : 1, pointerEvents: exclude === h.key ? "none" : "auto" }}
          >
            <Stack align="center" gap={2}>
              <HeroGlyph heroKey={h.key} size={26} />
              <Text className="pickerCardLabel">{h.name}</Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export default function HeroPicker({ onConfirm }) {
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);

  return (
    <Stack align="center" gap="md" className="pickerScreen">
      <Title order={1} className="glow">
        WHEELS
      </Title>
      <Text className="hint">choose your left hero (Squares) and right hero (Diamonds)</Text>

      <div className="pickerCols">
        <PickerColumn label="left — squares" heroes={HERO_LIST} selected={left} onSelect={setLeft} exclude={right} />
        <PickerColumn label="right — diamonds" heroes={HERO_LIST} selected={right} onSelect={setRight} exclude={left} />
      </div>

      <Button disabled={!left || !right} onClick={() => onConfirm(left, right)}>
        begin
      </Button>

      <a href="../" className="back">
        &larr; back to the portal
      </a>
    </Stack>
  );
}
