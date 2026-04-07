import { GlobeCanvas } from "./components/globe-canvas.js";
import { LoadingScreen } from "./components/loading-screen.js";
import { Vignette } from "./components/vignette.js";

export function App(): React.ReactElement {
  return (
    <div className="relative w-full h-full">
      <GlobeCanvas />
      <Vignette />
      <LoadingScreen />
    </div>
  );
}
