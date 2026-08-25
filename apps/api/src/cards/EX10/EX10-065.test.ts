import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-065.js";
import "../index.js";

const CARD_ID = "EX10-065";

describe("EX10-065 Yukio Oikawa", () => {
  it("records the exact catalog and complete contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["-"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }],
          },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Rush" },
              optional: true,
              abortOnDecline: true,
              cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, isSelf: true } },
            },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
  });

  it("sets memory to 3 only from 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "oikawa" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fireForPermanent(EffectTiming.OnStartTurn, low.perm("oikawa"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "oikawa" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).fireForPermanent(EffectTiming.OnStartTurn, high.perm("oikawa"));
    expect(high.state.memory).toBe(4);
  });

  it("deletes itself to give the played Myotismon Rush and then gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "oikawa" },
            { card: "EX10-048", as: "myotismon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const oikawaId = s.perm("oikawa").permanentId;
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("myotismon").permanentId });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === oikawaId) &&
        observe(s.engine).hasKeyword(s.perm("myotismon"), "Rush") &&
        s.state.memory === 1,
    );
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("myotismon"), "Rush")).toBe(true);
  });

  it("Q5180 gains no memory or Rush when the delete cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "oikawa" },
            { card: "EX10-048", as: "myotismon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("myotismon").permanentId });
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("oikawa").permanentId,
    );
    expect(observe(s.engine).hasKeyword(s.perm("myotismon"), "Rush")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "oikawa" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("oikawa"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
