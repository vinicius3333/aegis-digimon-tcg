import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-006.js";
import "../index.js";

describe("EX11-006 Flickmon", () => {
  it("uses a linked Maquinamon to evolve the host into a Maquinamon-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-006"] }],
          hand: [{ card: "EX11-027", as: "linkCard" }, { card: "EX11-029", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "linkCard", instanceId: s.inst("linkCard").instanceId, targetPermanentId: s.perm("host").permanentId })).toEqual({ ok: true });
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("EX11-027");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player", seat: 1 } })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX11-029");
    expect(s.perm("host").topCard?.cardId).toBe("EX11-029");
  });
});
