import { createTheme } from "@mantine/core";
import { PERIODS } from "./periods.js";

export function createAppTheme(period) {
  const p = PERIODS[period] || PERIODS.night;
  return createTheme({
    primaryColor: "brand",
    primaryShade: 4,
    colors: { brand: p.shades },
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    headings: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: "600",
    },
    defaultRadius: "md",
    components: {
      Button: {
        defaultProps: { fw: 500 },
      },
    },
  });
}
