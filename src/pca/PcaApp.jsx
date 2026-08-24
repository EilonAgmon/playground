import { useState } from "react";
import { Stack, Title, Text } from "@mantine/core";
import { HOTSPOTS, SCENE_IMAGE, SCENE_LABEL } from "./hotspots.js";
import { Header } from "../shared/Header.jsx";
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
      <Header floating />
      <Stack align="center" gap={2} className="pcaHeader">
        <Title order={1} className="glow">
          PCA
        </Title>
        <Text className="hint">{SCENE_LABEL} &mdash; chapter one, in progress</Text>
      </Stack>

      <div className="pcaScene" style={{ backgroundImage: `url(${SCENE_IMAGE})` }}>
        {HOTSPOTS.map((hotspot) => (
          <div
            key={hotspot.id}
            className={`pcaHotspot ${activeId === hotspot.id ? "active" : ""}`}
            style={hotspot.style}
            onClick={() => handleExamine(hotspot)}
          >
            <span className="propLabel">{hotspot.label}</span>
          </div>
        ))}
      </div>

      <div className="descriptionBar">
        <Text className="descriptionText">{description}</Text>
      </div>

      <div className="inventoryBar">
        {Array.from({ length: INVENTORY_SLOTS }).map((_, i) => (
          <div key={i} className="inventorySlot" />
        ))}
      </div>
    </Stack>
  );
}
