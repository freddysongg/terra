import type React from "react";
import {
  SunDim,
  Cloud,
  Activity,
  Droplets,
  Mountain,
  AlertTriangle,
  Snowflake,
  Zap,
  CloudSnow,
  Thermometer,
  Flame,
  Waves,
  FlameKindling,
} from "lucide-react";

type IconName =
  | "sun-dim"
  | "cloud"
  | "activity"
  | "droplets"
  | "mountain"
  | "alert-triangle"
  | "snowflake"
  | "zap"
  | "cloud-snow"
  | "thermometer"
  | "flame"
  | "waves"
  | "flame-kindling";

interface CategoryIconProps {
  iconName: string;
  className?: string;
  style?: React.CSSProperties;
}

const ICON_COMPONENT_MAP: Record<IconName, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "sun-dim": SunDim,
  "cloud": Cloud,
  "activity": Activity,
  "droplets": Droplets,
  "mountain": Mountain,
  "alert-triangle": AlertTriangle,
  "snowflake": Snowflake,
  "zap": Zap,
  "cloud-snow": CloudSnow,
  "thermometer": Thermometer,
  "flame": Flame,
  "waves": Waves,
  "flame-kindling": FlameKindling,
};

export function CategoryIcon({ iconName, className, style }: CategoryIconProps): React.ReactElement {
  const IconComponent = ICON_COMPONENT_MAP[iconName as IconName] ?? Activity;
  return <IconComponent className={className} style={style} />;
}
