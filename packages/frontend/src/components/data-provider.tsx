import type { ReactNode } from "react";
import { useEonetPolling } from "../hooks/use-eonet-polling.js";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps): React.ReactElement {
  useEonetPolling();
  return <>{children}</>;
}
