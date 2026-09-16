"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PinMapContextValue = {
  revision: number;
  refreshPins: () => void;
};

type PinMapProviderProps = {
  children: ReactNode;
};

const PinMapContext = createContext<PinMapContextValue | null>(null);

export default function PinMapProvider({ children }: PinMapProviderProps) {
  const [revision, setRevision] = useState(0);
  const refreshPins = useCallback(() => {
    setRevision((currentRevision) => currentRevision + 1);
  }, []);
  const value = useMemo(
    () => ({ refreshPins, revision }),
    [refreshPins, revision],
  );

  return (
    <PinMapContext.Provider value={value}>{children}</PinMapContext.Provider>
  );
}

export function usePinMap() {
  const value = useContext(PinMapContext);
  if (!value) {
    throw new Error("usePinMap must be used inside PinMapProvider.");
  }

  return value;
}
