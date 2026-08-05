import { useEffect, useState } from "react";
import { getTimeOfDay } from "./periods.js";

export function useTimeOfDay() {
  const [period, setPeriod] = useState(getTimeOfDay());

  useEffect(() => {
    const id = setInterval(() => setPeriod(getTimeOfDay()), 60000);
    return () => clearInterval(id);
  }, []);

  return period;
}

export function useDayFraction() {
  const [fraction, setFraction] = useState(dayFraction());

  useEffect(() => {
    const id = setInterval(() => setFraction(dayFraction()), 60000);
    return () => clearInterval(id);
  }, []);

  return fraction;
}

function dayFraction(date = new Date()) {
  return (date.getHours() * 60 + date.getMinutes()) / 1440;
}
