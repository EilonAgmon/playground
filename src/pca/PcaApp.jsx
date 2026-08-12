import { useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { HOTSPOTS } from "./hotspots.js";
import "./pca.css";

const DEFAULT_TEXT = "Click around the scene to examine things.";
const INVENTORY_SLOTS = 6;

export default function PcaApp() {
  const [description, setDescription] = useState(DEFAULT_TEXT);
  const [activeId, setActiveId] = useState(null);

  function handleExamine(hotspot) {
    setActiveId(hotspot.id);
    setDescription(hotspot.examine);
  }

  return (
    <Stack id="pca" align="center" gap="md">
      <Stack align="center" gap={2}>
        <Title order={1} className="glow">
          PCA
        </Title>
        <Text className="hint">a point &amp; click adventure &mdash; chapter one, in progress</Text>
      </Stack>

      <div className="pcaScene">
        <div className={`pcaProp pcaBookshelf ${activeId === "bookshelf" ? "active" : ""}`} style={HOTSPOTS[0].style} onClick={() => handleExamine(HOTSPOTS[0])}>
          <div className="shelfRow" />
          <div className="shelfRow" />
          <div className="shelfRow" />
          <span className="propLabel">{HOTSPOTS[0].label}</span>
        </div>

        <div className={`pcaProp pcaWindow ${activeId === "window" ? "active" : ""}`} style={HOTSPOTS[1].style} onClick={() => handleExamine(HOTSPOTS[1])}>
          <div className="windowCross" />
          <span className="propLabel">{HOTSPOTS[1].label}</span>
        </div>

        <div className={`pcaProp pcaDoor ${activeId === "door" ? "active" : ""}`} style={HOTSPOTS[2].style} onClick={() => handleExamine(HOTSPOTS[2])}>
          <div className="doorKnob" />
          <span className="propLabel">{HOTSPOTS[2].label}</span>
        </div>
      </div>

      <div className="descriptionBar">
        <Text className="descriptionText">{description}</Text>
      </div>

      <div className="inventoryBar">
        {Array.from({ length: INVENTORY_SLOTS }).map((_, i) => (
          <div key={i} className="inventorySlot" />
        ))}
      </div>

      <Anchor href="../" className="back" underline="hover">
        &larr; back to the portal
      </Anchor>
    </Stack>
  );
}
