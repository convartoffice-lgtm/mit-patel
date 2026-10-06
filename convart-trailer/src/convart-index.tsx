import { Composition, registerRoot } from "remotion";
import { ConvartTrailer } from "./ConvartTrailer";

// Standalone entry so the ConvArt trailer renders without loading other
// compositions' remote Google Fonts.
const ConvartRoot: React.FC = () => (
  <Composition
    id="ConvartTrailer"
    component={ConvartTrailer}
    durationInFrames={1500}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(ConvartRoot);
