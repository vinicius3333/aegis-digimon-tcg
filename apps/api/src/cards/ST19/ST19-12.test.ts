import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-12.js";

describe("ST19-12 Familiar Token", () => {
  it("creates the printed Yellow 3000 DP token and resolves its On Deletion effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST19-10", as: "host" }], hand: [{ card: "ST19-12", as: "cendrill" }] },
        1: { battleArea: [{ card: "AD1-001", dp: 7000, as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tokenDefinition = getCardDefinition("TOKEN-Familiar-Token");
    expect(tokenDefinition).toMatchObject({ dp: 3000, colors: ["Yellow"], isToken: true });

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("cendrill").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Familiar-Token").length === 2);
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Familiar-Token");
    expect(token).toBeDefined();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: token!.permanentId,
      target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
    })).toEqual({ ok: true });
    await settle(() => (s.perm("opponent").currentDP ?? 7000) === 4000);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });
});
