import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-04", () => {
  it("implements the errata's one-source removal boundary", () => {
    expect(getCardDefinition("ST21-04")?.effectText).toContain("1 or fewer digivolution cards");
    const action = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "TrashDigivolution",
      target: { count: 1 },
      amount: 1,
      scaling: { per: 2, unit: "colors" },
    });
  });
  it("makes Alliance mandatory while keeping the subsequent attack optional", () => {
    const actions = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "YourTurn")?.actions ?? [];
    expect(actions.some((a) => a.kind === "SubTrigger")).toBe(true);
    expect(actions.at(-1)).toMatchObject({ kind: "Attack", optional: true });
  });

  it("returns only an opponent Digimon at the one-source boundary on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-04", as: "zudomon" }] },
        1: {
          battleArea: [
            { card: "BT1-021", as: "eligible", under: ["BT1-009"] },
            { card: "BT1-040", as: "tooMany", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const tooManyId = s.perm("tooMany").permanentId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tooManyId)).toBe(true);
    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT1-021")).toBe(true);
  });
});
