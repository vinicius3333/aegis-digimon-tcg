import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-016.js";

describe("LM-016 Gammamon", () => {
  it("digivolves for free out of the trash when an effect deletes another of your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-016", as: "gammamon" },
            { card: "BT1-024", as: "ally" },
          ],
          trash: [{ card: "BT10-078", as: "gulusGammamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect");
    await settle(() => s.perm("gammamon").topCard?.cardId === "BT10-078", 2000);

    expect(s.perm("gammamon").topCard?.cardId).toBe("BT10-078");
    expect(s.state.memory).toBe(0);
  });

  it("stays put when the deletion came from battle rather than an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-016", as: "gammamon" },
            { card: "BT1-024", as: "ally", dp: 1000 },
          ],
          trash: [{ card: "BT10-078", as: "gulusGammamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byBattle");
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("gammamon").topCard?.cardId).toBe("LM-016");
  });

  it("does not react to its own deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-016", as: "gammamon" }],
          trash: [{ card: "BT10-078", as: "gulusGammamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const gammamonId = s.perm("gammamon").permanentId;

    await advance(s.engine).verb.deletePermanent([gammamonId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === gammamonId)).toBe(false);
  });

  it("plays Hiro Amanokawa from hand when the inherited Gammamon effect is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-001", as: "stack", under: ["LM-016"] }],
          hand: [{ card: "BT21-080", as: "hiro" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("stack").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080")).toBe(true);
  });

  it("leaves Hiro in hand when the inherited play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-001", as: "stack", under: ["LM-016"] }],
          hand: [{ card: "BT21-080", as: "hiro" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("stack").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-080")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-016");
    const compiled = runtimeCompiledCard("LM-016");
    expect(definition?.nameEn).toBe("Gammamon");
    expect(definition?.colors).toEqual(["Purple"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ frequency: "OncePerTurn" });
  });
});
