import type { ReactNode } from "react";
import { useEonetPolling } from "../hooks/use-eonet-polling.js";
import { useUsgsPolling } from "../hooks/use-usgs-polling.js";
import { useFirmsPolling } from "../hooks/use-firms-polling.js";
import { useNwsPolling } from "../hooks/use-nws-polling.js";
import { useDonkiPolling } from "../hooks/use-donki-polling.js";
import { initStoreBridge } from "../dev/store-bridge.js";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps): React.ReactElement {
  initStoreBridge();
  useEonetPolling();
  useDonkiPolling();
  useUsgsPolling();
  useFirmsPolling();
  useNwsPolling();
  return <>{children}</>;
}
