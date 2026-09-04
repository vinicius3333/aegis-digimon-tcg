import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-009.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-009 Lavorvomon", () => {
  it("returns a Machine Dragon/Sky Dragon or Hina from trash on play and can play Hina on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { zone: "trash" } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "zoneCount", zone: "battleArea", op: "lte", value: 1 },
    });
  });
  it("inherits permanent +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("returns a matching card from trash on play and plays Hina from hand on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX7-065"],
          trash: ["EX7-042"],
          battleArea: [{ card: "EX7-009", as: "lavorvomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lavorvomon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX7-042"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX7-042")).toBe(true);
  });

  it("plays exact Hina Kurihara on digivolving but leaves another Tamer in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX3-065", "EX7-065"],
          battleArea: [{ card: "EX7-009", as: "lavorvomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lavorvomon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX3-065"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX3-065")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-065");
  });

  it("applies the inherited +2000 DP modifier to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-009"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });
});
