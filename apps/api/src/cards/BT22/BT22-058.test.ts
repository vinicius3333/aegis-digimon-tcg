import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-058.js";

describe("BT22-058 Dreammon", () => {
  it("carries its Appmon Link requirement and When Linking De-Digivolve", () => {
    expect(getCardDefinition("BT22-058")).toMatchObject({
      linkDp: 3000,
      linkRequirement: "[Link] [Appmon] trait: Cost 2",
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenLinking")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(getEffectModule("BT22-058")?.effectsForTiming(EffectTiming.OnLinking, {} as never)).toHaveLength(1);
  });

  it("protects one own Digimon from opponent return effects after this card is linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              restriction: "returnToHandOrDeck",
              byOpponentEffectsOnly: true,
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("pays 2, links from hand to an Appmon, and De-Digivolves through the public intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT22-058", as: "dreammon" }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT22-068"] }] },
      },
      { autoSelectCards: true },
    );
    const dreammonId = s.inst("dreammon").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: dreammonId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT22-068");

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.some((card) => card.instanceId === dreammonId)).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("BT22-068");
  });

  it("protects an own Digimon when Dreammon itself receives a link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-058", as: "dreammon" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("dreammon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("dreammon"), "beReturned"));

    expect(observe(s.engine).isRestricted(s.perm("dreammon"), "beReturned")).toBe(true);
  });
});
