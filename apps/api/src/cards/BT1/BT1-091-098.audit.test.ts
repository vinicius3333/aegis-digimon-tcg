import { describe, expect, it } from "vitest";
import { compiled as scrapClaw } from "./BT1-091.js";
import { compiled as greatTornado } from "./BT1-093.js";
import { compiled as madDogFire } from "./BT1-096.js";
import { compiled as vNovaBlast } from "./BT1-098.js";

describe("BT1 option IR coverage", () => {
  it("preserves full main and security coverage for the migrated options", () => {
    for (const card of [scrapClaw, greatTornado, madDogFire, vNovaBlast]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
    expect(scrapClaw.effects[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Piercing" } });
    expect(greatTornado.effects).toMatchObject([{ trigger: "Main" }, { trigger: "Security" }]);
    expect(madDogFire.effects[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000 });
    expect(vNovaBlast.effects[1]?.actions[0]).toMatchObject({ kind: "AddToHandSelf" });
  });
});
