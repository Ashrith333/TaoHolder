"use client";
import { useEffect, useState } from "react";

/** Avoid hydration mismatch for values read from localStorage. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
