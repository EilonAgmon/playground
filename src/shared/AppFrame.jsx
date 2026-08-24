import { MantineProvider } from "@mantine/core";
import { createAppTheme } from "./mantineTheme.js";
import { useTimeOfDay } from "./useTimeOfDay.js";
import { Ambiance } from "./Ambiance.jsx";

export function AppFrame({ children }) {
  const period = useTimeOfDay();
  const theme = createAppTheme(period);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Ambiance />
      {children}
    </MantineProvider>
  );
}
