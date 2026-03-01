import { css, html, LitElement, nothing, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardEditor,
} from "custom-card-helpers";
import { registerCustomCard } from "../utils/custom-cards";
import { CARD_NAME, CARD_EDITOR_NAME } from "../const";
import { DoomCardConfig } from "./doom-card-config";
import { DOOM_STATIC_BASE } from "./const";

const ASSETS_PATH = `${DOOM_STATIC_BASE}/assets`;
const PING_INTERVAL_MS = 2000;

declare global {
  interface Window {
    Dos: (
      canvas: HTMLCanvasElement,
      options: { wdosboxUrl: string }
    ) => {
      ready: (
        callback: (fs: DosFS, main: DosMain) => void
      ) => void;
    };
  }
}

interface DosFS {
  createFile(path: string, data: string | Uint8Array): void;
}

type DosMain = (args: string[]) => Promise<unknown>;

/** Load js-dos.js into the global scope exactly once. */
let jsDosLoadPromise: Promise<void> | null = null;
function ensureJsDosLoaded(): Promise<void> {
  if (jsDosLoadPromise) return jsDosLoadPromise;
  if ("Dos" in window) {
    jsDosLoadPromise = Promise.resolve();
    return jsDosLoadPromise;
  }
  jsDosLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${ASSETS_PATH}/js-dos.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load js-dos"));
    document.head.appendChild(script);
  });
  return jsDosLoadPromise;
}

async function fetchBinary(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
  return new Uint8Array(await resp.arrayBuffer());
}

registerCustomCard({
  type: CARD_NAME,
  name: "DOOM",
  description: "Play the original DOOM in your Home Assistant dashboard.",
});

@customElement(CARD_NAME)
export class DoomCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public layout?: string;

  @state() private _config?: DoomCardConfig;
  @state() private _gameStarted = false;
  @state() private _loading = false;

  private _doomRunning = false;
  private _entryId?: string;
  private _pingInterval?: ReturnType<typeof setInterval>;
  private _commandInterface?: { exit: () => void };
  private _boundBeforeUnload = this._stopPinging.bind(this);
  private _boundVisibilityChange = this._handleVisibilityChange.bind(this);

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./doom-card-editor");
    return document.createElement(CARD_EDITOR_NAME) as LovelaceCardEditor;
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      sound: true,
      auto_start: false,
    };
  }

  public setConfig(config: DoomCardConfig): void {
    this._config = {
      ...config,
      type: `custom:${CARD_NAME}`,
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(options?: { columns?: number }) {
    // Maintain 4:3 aspect ratio: at 12 columns, 5 rows is correct.
    const columns = options?.columns ?? 12;
    const rows = Math.max(2, Math.round((columns * 5) / 12));
    return {
      columns: 12,
      rows,
      min_columns: 3,
      min_rows: 2,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this._boundBeforeUnload);
    document.addEventListener(
      "visibilitychange",
      this._boundVisibilityChange
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyDoom();
    window.removeEventListener("beforeunload", this._boundBeforeUnload);
    document.removeEventListener(
      "visibilitychange",
      this._boundVisibilityChange
    );
  }

  protected firstUpdated(): void {
    if (this._config?.auto_start) {
      this._startDoom();
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // When auto_start is set via setConfig after the element is already
    // in the DOM (e.g. inside the IDDQD dialog), firstUpdated has already
    // fired without a config. Catch that case here.
    if (
      changed.has("_config") &&
      this._config?.auto_start &&
      !this._doomRunning &&
      !this._gameStarted
    ) {
      this._startDoom();
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const useFixedRatio = this.layout !== "panel" && this.layout !== "grid";

    return html`
      <ha-card .header=${this._config.title || nothing}>
        <div
          id="root"
          style="${useFixedRatio ? "padding-top: 75%" : ""}"
          @keydown=${this._trapKey}
          @keyup=${this._trapKey}
          @keypress=${this._trapKey}
        >
          <div id="game"></div>
          ${!this._gameStarted
            ? html`
                <div
                  id="overlay"
                  style="background-image: url('${ASSETS_PATH}/titlepic.png')"
                  @click=${this._startDoom}
                >
                  <p>Click to play</p>
                </div>
              `
            : nothing}
          ${this._loading
            ? html`
                <div id="loading">
                  <div class="spinner"></div>
                  <p>Loading DOOM...</p>
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  /** Prevent keyboard events from reaching Home Assistant. */
  private _trapKey(ev: Event): void {
    if (this._doomRunning) {
      ev.stopPropagation();
    }
  }

  private async _startDoom(): Promise<void> {
    if (this._doomRunning) return;
    this._doomRunning = true;
    this._gameStarted = true;
    this._loading = true;

    // Wait for Lit to render the game container
    await this.updateComplete;

    await ensureJsDosLoaded();

    // Create the canvas imperatively so Lit won't reconcile it
    const container = this.shadowRoot!.getElementById("game")!;
    const canvas = document.createElement("canvas");
    canvas.id = "doom-canvas";
    container.appendChild(canvas);

    const soundEnabled = this._config?.sound !== false;

    const [doomExe, doomWad, defaultCfg, dosboxConf] = await Promise.all([
      fetchBinary(`${ASSETS_PATH}/DOOM.EXE`),
      fetchBinary(`${ASSETS_PATH}/DOOM1.WAD`),
      fetchBinary(`${ASSETS_PATH}/DEFAULT.CFG`),
      fetch(`${ASSETS_PATH}/dosbox.conf`).then((r) => r.text()),
    ]);

    window
      .Dos(canvas, { wdosboxUrl: `${ASSETS_PATH}/wdosbox.js` })
      .ready((fs: DosFS, main: DosMain) => {
        fs.createFile(".jsdos/dosbox.conf", dosboxConf);
        fs.createFile("DOOM.EXE", doomExe);
        fs.createFile("DOOM1.WAD", doomWad);
        fs.createFile("DEFAULT.CFG", defaultCfg);

        if (!soundEnabled) {
          fs.createFile(
            "/nosound.conf",
            [
              "[speaker]",
              "pcspeaker=false",
              "[sblaster]",
              "sbtype=none",
              "[midi]",
              "mpu401=none",
              "",
            ].join("\n")
          );
        }

        this._loading = false;

        const args = ["-conf", ".jsdos/dosbox.conf"];
        if (!soundEnabled) {
          args.push("-conf", "/nosound.conf");
        }

        main(args).then((ci: unknown) => {
          this._commandInterface = ci as { exit: () => void };
          canvas.focus();
          this._resolveEntryId().then(() => this._startPinging());
        });
      });
  }

  /** Tear down the running DOSBox instance and clean up. */
  private _destroyDoom(): void {
    this._stopPinging();
    if (this._commandInterface) {
      try {
        this._commandInterface.exit();
      } catch {
        // Best effort — DOSBox may already be gone
      }
      this._commandInterface = undefined;
    }
    // Close any AudioContext that js-dos/DOSBox created
    const audioCtx = (window as unknown as Record<string, unknown>)
      ._audioContext as AudioContext | undefined;
    if (audioCtx?.state !== "closed") {
      audioCtx?.close().catch(() => {});
    }
    // Remove the canvas and any DOSBox wrapper elements
    const container = this.shadowRoot?.getElementById("game");
    if (container) {
      container.innerHTML = "";
    }
    this._doomRunning = false;
    this._gameStarted = false;
    this._loading = false;
  }

  // --- Binary sensor ping/stop ---

  private async _resolveEntryId(): Promise<void> {
    if (this._entryId || !this.hass) return;
    try {
      const result = await this.hass.callWS<
        { entry_id: string; domain: string }[]
      >({
        type: "config_entries/get",
      });
      const entry = result.find((e) => e.domain === "doom");
      if (entry) {
        this._entryId = entry.entry_id;
      }
    } catch {
      // Pinging won't work, but the game still plays fine
    }
  }

  private _startPinging(): void {
    this._stopPinging();
    this._sendPing();
    this._pingInterval = setInterval(
      () => this._sendPing(),
      PING_INTERVAL_MS
    );
  }

  private _stopPinging(): void {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = undefined;
    }
    this._sendStop();
  }

  private _sendPing(): void {
    if (!this.hass || !this._entryId) return;
    this.hass
      .callWS({ type: "doom/ping", entry_id: this._entryId })
      .catch(() => {});
  }

  private _sendStop(): void {
    if (!this.hass || !this._entryId) return;
    this.hass
      .callWS({ type: "doom/stop", entry_id: this._entryId })
      .catch(() => {});
  }

  private _handleVisibilityChange(): void {
    if (!this._doomRunning) return;
    if (document.hidden) {
      this._stopPinging();
    } else {
      this._startPinging();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        overflow: hidden;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      #root {
        width: 100%;
        height: 100%;
        position: relative;
        background: #000;
      }
      #game {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      #game canvas {
        width: 100% !important;
        height: 100% !important;
        image-rendering: pixelated;
      }
      /* js-dos wraps the canvas in a .dosbox-container div */
      #game .dosbox-container {
        width: 100% !important;
        height: 100% !important;
      }
      #game .dosbox-container canvas {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain;
      }
      #overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #000;
        background-repeat: no-repeat;
        background-position: center center;
        background-size: contain;
        z-index: 100;
        cursor: pointer;
        font-family: "Courier New", monospace;
        image-rendering: pixelated;
      }
      #overlay p {
        color: #fff;
        font-family: "Courier New", monospace;
        font-size: 1.05em;
        font-weight: bold;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: 0.6em 1.6em;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        margin-bottom: 2em;
        animation: pulse-glow 2.5s ease-in-out infinite;
      }
      @keyframes pulse-glow {
        0%,
        100% {
          box-shadow: 0 0 8px rgba(139, 0, 0, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(139, 0, 0, 0.7),
            0 0 40px rgba(139, 0, 0, 0.3);
        }
      }
      #loading {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 99;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: "Courier New", monospace;
      }
      #loading p {
        color: #8b0000;
        font-size: 1.5em;
        margin-top: 1em;
      }
      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #333;
        border-top: 4px solid #8b0000;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
  }
}


