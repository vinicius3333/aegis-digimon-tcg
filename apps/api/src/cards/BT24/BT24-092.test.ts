import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_092 } from "./BT24-092.js";
import "../index.js";

describe("BT24-092 Shock Plasma", () => {
  it("reduces an opponent Digimon and optionally links to your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-092", as: "option" }],
          battleArea: [
            { card: "BT24-009", as: "ts" },
            { card: "BT24-009", as: "host" },
          ],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const option = s.inst("option");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 7000);

    expect(s.perm("opponent").currentDP).toBe(7000);
    const link = BT24_092.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1];
    expect(link).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });
});
