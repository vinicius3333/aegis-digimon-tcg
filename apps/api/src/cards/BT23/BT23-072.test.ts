import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-072.js";

function mainEffectKey(s: EngineSetup): string {
  const source = (s.engine as any).cardSourceOf(s.inst("handDrasil"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-072/"))!
    .effectKey;
}

describe("BT23-072 King Drasil_7D6", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-072")).toMatchObject({
      cardId: "BT23-072",
      nameEn: "King Drasil_7D6",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 6,
      dp: 9000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["9000", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays 3, places this hand card at the breeding host's stack bottom, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", under: ["BT23-003"], as: "mother" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const drasilId = s.inst("handDrasil").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: drasilId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === drasilId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("mother").stack[0]?.instanceId).toBe(drasilId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("suspends itself when an own CS Digimon is played and anchors all grants to that subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-072", as: "drasil" },
            { card: "BT23-073", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    expect(s.perm("drasil").isSuspended).toBe(true);
    expect(
      ["Rush", "Raid", "Reboot", "Blocker"].map((keyword) => observe(s.engine).hasKeyword(s.perm("played"), keyword)),
    ).toEqual([true, true, true, true]);
  });

  it("pays 3 and places this hand card under King Drasil or Mother Eater in breeding before drawing", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: {
          filter: { zone: "breeding", nameOrTrait: [{ tokens: ["King Drasil_7D6", "Mother Eater"], match: "name" }] },
        },
      },
      additionalCosts: [{ kind: "payMemory", memory: 3 }],
    });
  });

  it("grants all four keywords to the played Royal Knight/CS Digimon after suspending this card", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({ event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"] } });
    expect(watcher.actions.map((action: any) => action.keyword.keyword)).toEqual(["Rush", "Raid", "Reboot", "Blocker"]);
    expect(watcher.actions[0].target.sourceRef).toBe("triggerSubject");
    expect(watcher.actions.slice(1).every((action: any) => action.target.sameTarget === true)).toBe(true);
  });

  it("from breeding plays a King Drasil stack card for free only at six or more digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "BT22-007",
            under: ["BT23-072", "BT23-003", "BT23-003", "BT23-003", "BT23-003", "BT23-072"],
            as: "mother",
          },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-072"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-072")).toBe(true);
    expect(s.perm("mother").stack).toHaveLength(5);

    const short = setupEngine(
      {
        0: {
          breeding: {
            card: "BT22-007",
            under: ["BT23-072", "BT23-003", "BT23-003", "BT23-003", "BT23-072"],
            as: "mother",
          },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(short.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(short.state.players[0]!.battleArea).toHaveLength(0);
  });
});
