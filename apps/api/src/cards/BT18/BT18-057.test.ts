import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-057.js";

describe("BT18-057 KoKabuterimon", () => {
  it("reduces a qualifying multicolor black-and-yellow digivolution by one", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-057", as: "koKabuterimon" }], hand: [{ card: "BT11-040", as: "sukamon" }] },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koKabuterimon").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koKabuterimon").topCard?.cardId === "BT11-040");
    expect(s.state.memory).toBe(9);
    expect(getCardDefinition("BT11-040")?.colors).toEqual(["Yellow", "Black"]);
  });
});
