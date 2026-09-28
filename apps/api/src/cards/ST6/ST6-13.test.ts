import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-13.js";

describe("ST6-13 CresGarurumon", () => {
  it("has Security Attack +1 and Digi-Bursts 2 to play a purple level 3 from trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST6-13", as: "cres", under: [{ card: "ST6-03", as: "rookie" }, "ST6-06"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("cres"), "SecurityAttack")).toBe(1);
    const entry = JSON.parse(s.perm("cres").activatableEffectsJson) as { instanceId: string; effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: entry[0]!.instanceId,
        effectKey: entry[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId),
    );
    expect(s.perm("cres").stack).toHaveLength(0);
  });
});

describe("ST6-13 CresGarurumon — KB Q&A rulings", () => {
  it("plays the purple level 3 its own Digi-Burst just trashed, without paying its cost (Q675)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-13", as: "cres", under: [{ card: "ST6-02", as: "burstRookie" }, "ST6-06"] }],
          trash: ["ST6-06"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.state.players[0]!.trash.some((card) => getCardDefinition(card.cardId)?.level === 3)).toBe(false);

    const [burst] = observe(s.engine).activatableEffects(s.perm("cres"));
    expect(burst).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: burst!.instanceId ?? s.perm("cres").topCard.instanceId,
        effectKey: burst!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("burstRookie").instanceId),
    );

    expect(s.perm("cres").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("burstRookie").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "ST6-06")).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });
});
