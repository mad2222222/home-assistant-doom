import { LovelaceCardConfig } from "custom-card-helpers";

export interface DoomCardConfig extends LovelaceCardConfig {
  title?: string;
  sound?: boolean;
  auto_start?: boolean;
}
