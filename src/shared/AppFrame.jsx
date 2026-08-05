import { MantineProvider } from "@mantine/core";
import { createAppTheme } from "./mantineTheme.js";
import { useTimeOfDay } from "./useTimeOfDay.js";
import { RetroHorizon } from "./RetroHorizon.jsx";
import { CrtOverlay } from "./Icons.jsx";

export function AppFrame({ children }) {
  const period = useTimeOfDay();
  const theme = createAppTheme(period);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <RetroHorizon />
      <CrtOverlay />
      {children}
    </MantineProvider>
  );
}
