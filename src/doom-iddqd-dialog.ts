/**
 * DOOM IDDQD Dialog — native ha-dialog wrapping a doom-card.
 *
 * Opened via HA's show-dialog event system so it feels like a
 * first-class Home Assistant dialog. Reuses the doom-card element
 * so all sensor pings, session tracking, etc. work automatically.
 */

import { css, html, LitElement, nothing, CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCard } from "custom-card-helpers";
import setupCustomLocalize from "./localize";

type DoomCardElement = LovelaceCard & { hass?: HomeAssistant; layout?: string };

export interface DoomIddqdDialogParams {
  // Empty for now — no params needed
}

@customElement("doom-iddqd-dialog")
export class DoomIddqdDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @query("doom-card") private _card?: DoomCardElement;
  @state() private _open = false;
  @state() private _title = "GOD MODE ACTIVATED";

  public showDialog(_params: DoomIddqdDialogParams): void {
    const localize = setupCustomLocalize(this.hass);
    this._title = localize("dialog.iddqd.title");
    this._open = true;
    this.updateComplete.then(() => {
      this._setupCard();
    });
  }

  public closeDialog(): boolean {
    this._open = false;
    this._fireDialogClosed();
    return true;
  }

  private _setupCard(): void {
    if (this._card) {
      this._card.layout = "panel";
      this._card.setConfig({ type: "custom:doom-card", auto_start: true });
      this._card.hass = this.hass;
    }
  }

  private _fireDialogClosed(): void {
    this.dispatchEvent(
      new CustomEvent("dialog-closed", {
        bubbles: true,
        composed: true,
        detail: { dialog: this.localName },
      })
    );
  }

  private _handleDialogClosed(): void {
    this._open = false;
    this._fireDialogClosed();
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has("hass") && this.hass && this._card) {
      this._card.hass = this.hass;
    }
  }

  protected render() {
    if (!this._open) return nothing;

    return html`
      <ha-dialog
        .open=${this._open}
        @closed=${this._handleDialogClosed}
        flexcontent
      >
        <ha-dialog-header slot="header">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </ha-icon-button>
          <span slot="title">${this._title}</span>
        </ha-dialog-header>
        <doom-card></doom-card>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-dialog {
        --dialog-content-padding: 0;
        --mdc-dialog-max-width: min(90vw, calc(75vh * 8 / 5));
        --mdc-dialog-min-width: 0;
      }

      doom-card {
        display: block;
        width: 100%;
        aspect-ratio: 8 / 5;
      }

      /* Hide the ha-card chrome inside doom-card — the dialog
         already provides the header / frame. */
      doom-card::part(card) {
        border: none;
        box-shadow: none;
      }
    `;
  }
}
