import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import setupCustomLocalize from "../localize";
import { CARD_EDITOR_NAME } from "../const";
import { DoomCardConfig } from "./doom-card-config";

const SCHEMA = [
  {
    name: "title",
    selector: { text: {} },
  },
  {
    name: "sound",
    selector: { boolean: {} },
  },
  {
    name: "auto_start",
    selector: { boolean: {} },
  },
];

@customElement(CARD_EDITOR_NAME)
export class DoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DoomCardConfig;

  public setConfig(config: DoomCardConfig): void {
    this._config = {
      sound: true,
      auto_start: false,
      ...config,
    };
  }

  private _computeLabel = (entry: { name: string }): string => {
    const customLocalize = setupCustomLocalize(this.hass);
    return customLocalize(`editor.card.doom.${entry.name}`);
  };

  private _valueChanged(ev: CustomEvent): void {
    const detail = ev.detail as { value: DoomCardConfig };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: detail.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}
