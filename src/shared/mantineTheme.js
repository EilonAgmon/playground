import { createTheme } from "@mantine/core";
import { PERIODS } from "./periods.js";

export function createAppTheme(period) {
  const p = PERIODS[period] || PERIODS.night;
  return createTheme({
    primaryColor: "brand",
    primaryShade: 4,
    colors: { brand: p.shades },
    fontFamily: '"EB Garamond", Georgia, serif',
    headings: {
      fontFamily: '"Cinzel", Georgia, serif',
      fontWeight: "600",
    },
    defaultRadius: "sm",
    components: {
      Button: {
        defaultProps: { fw: 400 },
      },
    },
  });
}
