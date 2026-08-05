import { createTheme } from "@mantine/core";
import { PERIODS } from "./periods.js";

export function createAppTheme(period) {
  const p = PERIODS[period] || PERIODS.night;
  return createTheme({
    primaryColor: "brand",
    primaryShade: 4,
    colors: { brand: p.shades },
    fontFamily: '"Courier New", Courier, monospace',
    headings: {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontWeight: "400",
    },
    defaultRadius: "md",
    components: {
      Button: {
        defaultProps: { fw: 400 },
      },
    },
  });
}
