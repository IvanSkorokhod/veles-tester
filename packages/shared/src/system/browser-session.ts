export type BrowserSessionProbeState =
  | "CDP_UNAVAILABLE"
  | "BROWSER_CONNECTED"
  | "VELES_TAB_FOUND"
  | "VELES_TAB_NOT_FOUND"
  | "VELES_TAB_ACCESSIBLE";

export interface BrowserSessionProbeResult {
  state: BrowserSessionProbeState;
  browserConnected: boolean;
  velesTabFound: boolean;
  velesTabUrl?: string;
  velesTabTitle?: string;
  contextCount: number;
  pageCount: number;
  checkedAt: string;
  message: string;
}
