/* This file is generated from releases.json. */

export const APP_VERSION = "1.1.0";

export interface ReleaseNote {
  version: string;
  date: string;
  changes: Array<{
    type: "added" | "changed" | "fixed" | "removed";
    description: string;
    translations?: Record<string, string>;
  }>;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.0",
    date: "2026-08-09",
    changes: [
      { type: "fixed", description: "BT7-088" },
      { type: "fixed", description: "BT8-088" },
      { type: "fixed", description: "BT9-092" },
      { type: "fixed", description: "BT9-104" },
      { type: "fixed", description: "BT10-015" },
      { type: "fixed", description: "BT10-075" },
      { type: "fixed", description: "BT10-095" },
      { type: "fixed", description: "BT10-111" },
      { type: "fixed", description: "BT10-112" },
      { type: "fixed", description: "P-035" },
      { type: "fixed", description: "ST12-10" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-08-09",
    changes: [
      { type: "added", description: "Initial production release.", translations: {"pt-BR":"Lançamento inicial de produção."} },
    ],
  },
];
