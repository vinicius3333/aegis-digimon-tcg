// Synthetic guards for the external effect DigiXros expert teacher. They exercise the
// qualified API dist (AEGIS_QUALIFIED_ROOT, default: this checkout) through the real engine.
// They prove the decorator's contract and source metadata parity only, never an actual
// qualified run, primary policy, model or mastery acceptance.
//
//   node --test tools/bot-training/operators/material-teacher-effect.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  QUALIFIED_ROOT_OVERRIDE,
  createEffectPlayTeacherFactory,
  effectDigiXrosCandidates,
  loadQualifiedModules,
  qualifiedApiDist,
  rankEffectDigiXros,
} from "./material-teacher-effect-policy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env[QUALIFIED_ROOT_OVERRIDE] ?? join(here, "../../..");
const env = { ...process.env, [QUALIFIED_ROOT_OVERRIDE]: root };
const apiDist = qualifiedApiDist(env);
const entry = join(here, "material-teacher-effect-entry.mjs");
const actualFixture =
  process.env.MATERIAL_TEACHER_EFFECT_FIXTURE ??
  "/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training/2026-10-05-bt26-ex13-material-teacher-actual/bagra-effect-play-refusals.actual.json";
const ACTUAL_FIXTURE_SHA256 = "24b14f7d3287357fbde70909bc325e35795ac1b5ddc216720fb0d60c5c7433ab";

const load = (path) => import(pathToFileURL(join(apiDist, path)).href);
let modules, harness, view, evaluation, granted, shared;

before(async () => {
  modules = await loadQualifiedModules(apiDist);
  [harness, view, evaluation, granted, shared] = await Promise.all([
    load("engine/testkit/harness.js"),
    load("bot/view.js"),
    load("bot/policy.js"),
    load("engine/effects/interpreter/grantedEffects.js"),
    load("../node_modules/@aegis/shared/dist/index.js"),
    load("cards/index.js"),
  ]);
});

function run(args, input) {
  return spawnSync(process.execPath, args, { env, input, encoding: "utf8", timeout: 120_000 });
}

describe("entry metadata parity (source metadata only)", () => {
  for (const flag of ["--describe", "--describe-curriculum"])
    it(`emits the qualified worker's exact ${flag}`, () => {
      const original = run([join(apiDist, "bot/training/cli.js"), flag]);
      const expert = run([entry, flag]);
      assert.equal(original.status, 0);
      assert.equal(expert.status, 0);
      assert.equal(expert.stdout, original.stdout);
    });

  it("loads only the exact qualified path when no override is set", () => {
    const { [QUALIFIED_ROOT_OVERRIDE]: _override, ...production } = env;
    const result = spawnSync(process.execPath, [entry, "--describe"], { env: production, encoding: "utf8" });
    const expected = existsSync("/home/vinicius/aegis-bot-lab/checkouts/material-teacher-1cec011c0/apps/api/dist");
    if (expected) assert.equal(result.status, 0);
    else {
      assert.equal(result.status, 1);
      assert.match(JSON.parse(result.stdout).message, /ENOENT/);
    }
  });

  it("refuses an empty or relative override instead of resolving it against the working directory", () => {
    for (const override of ["", "relative/root"]) {
      const result = spawnSync(process.execPath, [entry, "--describe"], {
        env: { ...env, [QUALIFIED_ROOT_OVERRIDE]: override },
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(JSON.parse(result.stdout).message, /must be an absolute path/);
    }
  });

  it("replays an early teacher-following episode byte for byte against the qualified worker", () => {
    const decks = JSON.parse(run([join(apiDist, "bot/training/cli.js"), "--describe"]).stdout).decks;
    const config = JSON.stringify({
      seed: 6_101,
      decks: [decks[0].version, decks[1].version],
      learnerSeat: 0,
      teacher: true,
      maxDecisions: 40,
    });
    const transcript = (worker) => {
      // Drive one episode, always taking the teacher's label, and keep every emitted line.
      const script = `
        import { spawn } from "node:child_process";
        import { createInterface } from "node:readline";
        const child = spawn(process.execPath, [${JSON.stringify(worker)}], { stdio: ["pipe", "pipe", "ignore"] });
        child.stdin.write(${JSON.stringify(config)} + "\\n");
        for await (const line of createInterface({ input: child.stdout })) {
          process.stdout.write(line + "\\n");
          const message = JSON.parse(line);
          if (message.type === "decision")
            child.stdin.write(JSON.stringify({ decisionId: message.decisionId, action: message.teacher?.action ?? 0 }) + "\\n");
        }`;
      return run(["--input-type=module", "-e", script]).stdout;
    };
    const original = transcript(join(apiDist, "bot/training/cli.js"));
    assert.match(original, /"type":"truncated"/);
    assert.equal(transcript(entry), original);
  });
});

describe("actual refusal windows (read-only)", { skip: !existsSync(actualFixture) }, () => {
  const cases = () => JSON.parse(readFileSync(actualFixture, "utf8")).cases;

  it("binds the exact fixture bytes", () => {
    assert.equal(createHash("sha256").update(readFileSync(actualFixture)).digest("hex"), ACTUAL_FIXTURE_SHA256);
    assert.deepEqual(
      cases().map(({ episode, learnerSeat, originalFold }) => [episode, learnerSeat, originalFold]),
      [
        [216, 0, "training"],
        [260, 1, "validation"],
      ],
    );
  });

  it("episode 216: DarkKnightmon with hand DeadlyAxemon is the only expert candidate", () => {
    const { request, observation } = cases()[0].followingRefusalRow.window;
    const candidates = effectDigiXrosCandidates(modules, observation, request);
    assert.deepEqual(
      candidates.map(({ instanceId, definition }) => [instanceId, definition.cardId]),
      [["s0-22", "EX10-031"]],
    );
    assert.equal(rankEffectDigiXros(candidates, () => 1), "s0-22");
    assert.equal(rankEffectDigiXros(candidates, () => 0), undefined);
  });

  it("episode 260: the only DeadlyAxemon is in the trash, so the teacher stays unchanged", () => {
    const { request, observation } = cases()[1].followingRefusalRow.window;
    const own = observation.players[observation.seat];
    assert.ok(own.trash.some((card) => card.instanceId === "s1-19" && card.cardId === "EX10-027"));
    assert.deepEqual(effectDigiXrosCandidates(modules, observation, request), []);
  });
});

async function lordKnightmonPick(seat, hand, { trash = [], opponentHand = [] } = {}) {
  const s = harness.setupEngine({
    [seat]: {
      battleArea: [{ card: "BT5-042", as: "base" }],
      hand: [{ card: "EX13-064", as: "lord" }, ...hand],
      trash,
      deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-011"],
    },
    [1 - seat]: { hand: opponentHand, deck: ["BT1-011", "BT1-012", "BT1-013"] },
  });
  s.state.turnSeat = seat;
  s.state.memory = 5;
  await s.ready();
  assert.deepEqual(
    s.engine.applyIntent(seat, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lord").instanceId,
      useAlternateCost: true,
    }),
    { ok: true },
  );
  await harness.settle(() => s.state.pendingDecision !== undefined);
  const request = s.decisions.findLast(({ req }) => req.decisionId === s.state.pendingDecision.decisionId).req;
  return { s, request, botView: view.buildBotView(s.state, seat) };
}

for (const seat of [0, 1]) {
  describe(`synthetic EX13-064 route seat=${seat}`, () => {
    it("qualified teacher refuses; expert plays DarkKnightmon and the qualified teacher labels its material", async () => {
      const { s, request, botView } = await lordKnightmonPick(seat, [
        { card: "EX10-027", as: "deadlyAxemon" },
        { card: "EX10-031", as: "darkKnightmon" },
        { card: "EX13-074", as: "rie" },
      ]);
      const original = modules.createTrainingTeacher(s.engine, seat, 7);
      const refusal = original.answerDecision(botView, request);
      assert.deepEqual(refusal.response.instanceIds, []);
      assert.deepEqual(evaluation.createEvaluationPolicy().answerDecision(botView, request), refusal);

      const expert = createEffectPlayTeacherFactory(modules)(s.engine, seat, 7);
      const pick = expert.answerDecision(botView, request);
      assert.deepEqual(pick.response.instanceIds, [s.inst("darkKnightmon").instanceId]);
      assert.deepEqual(s.engine.applyIntent(seat, pick), { ok: true });

      await harness.settle(() => s.state.pendingDecision !== undefined);
      const material = s.decisions.findLast(({ req }) => req.decisionId === s.state.pendingDecision.decisionId).req;
      assert.equal(material.options.digiXrosCardId, "EX10-031");
      const materialView = view.buildBotView(s.state, seat);
      const label = expert.answerDecision(materialView, material);
      assert.deepEqual(label, modules.createTrainingTeacher(s.engine, seat, 7).answerDecision(materialView, material));
      assert.deepEqual(label.response.instanceIds, [s.inst("deadlyAxemon").instanceId]);
      assert.deepEqual(s.engine.applyIntent(seat, label), { ok: true });
      await harness.settle(() =>
        s.state.players[seat].battleArea.some((unit) => unit.topCard.instanceId === s.inst("darkKnightmon").instanceId),
      );
      const played = s.state.players[seat].battleArea.find(
        (unit) => unit.topCard.instanceId === s.inst("darkKnightmon").instanceId,
      );
      assert.deepEqual(
        played.stack.map((card) => card.instanceId),
        [s.inst("deadlyAxemon").instanceId],
      );
    });

    for (const [name, hand, trash] of [
      ["a trash-only material (episode 260 layout)", [{ card: "EX10-031", as: "darkKnightmon" }], ["EX10-027"]],
      ["a plain free play with no DigiXros card", [{ card: "EX10-027", as: "deadlyAxemon" }, { card: "EX13-074", as: "rie" }], []],
      ["an Option in the offered pool", [{ card: "EX10-031", as: "darkKnightmon" }, { card: "EX10-027", as: "d" }], ["BT18-099"]],
    ])
      it(`delegates unchanged for ${name}`, async () => {
        const { s, request, botView } = await lordKnightmonPick(seat, hand, { trash });
        const expert = createEffectPlayTeacherFactory(modules)(s.engine, seat, 7);
        const original = modules.createTrainingTeacher(s.engine, seat, 7);
        assert.deepEqual(expert.answerDecision(botView, request), original.answerDecision(botView, request));
      });

    it("delegates every unsafe source, request, filter or IR variant", async () => {
      const { s, request, botView } = await lordKnightmonPick(
        seat,
        [
          { card: "EX10-031", as: "darkKnightmon" },
          { card: "EX10-027", as: "deadlyAxemon" },
          { card: "BT1-010", as: "notKnightmon" },
        ],
        { opponentHand: [{ card: "EX10-031", as: "foreign" }] },
      );
      const observation = modules.trainingObservation(s.state, seat, request);
      assert.equal(effectDigiXrosCandidates(modules, observation, request).length, 1);
      const options = request.options;
      const variants = {
        purpose: { ...request, options: { ...options, purpose: "acceptedOptional" } },
        inherited: { ...request, options: { ...options, isInherited: true } },
        targetFate: { ...request, options: { ...options, targetFate: "trash" } },
        materialPicker: { ...request, options: { ...options, digiXrosCardId: "EX10-031" } },
        min: { ...request, options: { ...options, min: 1 } },
        max: { ...request, options: { ...options, max: 2 } },
        timing: { ...request, options: { ...options, timing: "OnPlay" } },
        sourceCard: { ...request, sourceCardId: "BT5-042" },
        sourceInstance: { ...request, sourceInstanceId: s.inst("darkKnightmon").instanceId },
        sourcePermanent: { ...request, sourcePermanentId: "perm-foreign" },
        empty: { ...request, options: { ...options, candidateInstanceIds: [] } },
        duplicate: {
          ...request,
          options: { ...options, candidateInstanceIds: [s.inst("darkKnightmon").instanceId, s.inst("darkKnightmon").instanceId] },
        },
        filterFails: {
          ...request,
          options: { ...options, candidateInstanceIds: [...options.candidateInstanceIds, s.inst("notKnightmon").instanceId] },
        },
        foreignCard: {
          ...request,
          options: { ...options, candidateInstanceIds: [...options.candidateInstanceIds, s.inst("foreign").instanceId] },
        },
        boardPermanent: { ...request, options: { ...options, candidateInstanceIds: [s.perm("base").permanentId] } },
      };
      for (const [name, variant] of Object.entries(variants))
        assert.equal(effectDigiXrosCandidates(modules, observation, variant), undefined, name);

      const tampered = (mutate) => ({
        ...modules,
        runtimeCompiledCard: (cardId) => {
          const compiled = structuredClone(modules.runtimeCompiledCard(cardId));
          if (cardId === "EX13-064") mutate(compiled);
          return compiled;
        },
      });
      for (const [name, mutate] of Object.entries({
        filter: (compiled) => (compiled.effects[0].actions[0].options[0][0].target.filter.playCostLte = 99),
        extraEffect: (compiled) => compiled.effects.push(structuredClone(compiled.effects[0])),
        inherited: (compiled) => (compiled.effects[0].isInherited = true),
      }))
        assert.equal(effectDigiXrosCandidates(tampered(mutate), observation, request), undefined, name);

      const foreignMaterial = structuredClone(observation);
      for (const card of foreignMaterial.players[seat].hand)
        if (card.cardId === "EX10-027") card.ownerSeat = 1 - seat;
      const darkKnightmonOnly = { ...request, options: { ...options, candidateInstanceIds: [s.inst("darkKnightmon").instanceId] } };
      assert.equal(effectDigiXrosCandidates(modules, observation, darkKnightmonOnly).length, 1);
      assert.deepEqual(effectDigiXrosCandidates(modules, foreignMaterial, darkKnightmonOnly), []);

      const expert = createEffectPlayTeacherFactory(modules)(s.engine, seat, 7);
      const original = modules.createTrainingTeacher(s.engine, seat, 7);
      for (const variant of [{ ...request, decisionId: "stale" }, { ...request, seat: 1 - seat }, variants.purpose])
        assert.deepEqual(expert.answerDecision(botView, variant), original.answerDecision(botView, variant));
    });
  });
}

describe("qualified card pool", () => {
  it("grants no [When Digivolving] effect, so a gained trigger cannot reuse EX13-064's identity", () => {
    const gains = [];
    const visit = (node, cardId) => {
      if (Array.isArray(node)) for (const child of node) visit(child, cardId);
      else if (node !== null && typeof node === "object") {
        if (
          (node.kind === "GainTriggeredEffect" || node.kind === "GainEffect") &&
          /digivolv/i.test(JSON.stringify([node.gainedTrigger, node.trigger, node.effect?.trigger]))
        )
          gains.push(cardId);
        for (const child of Object.values(node)) visit(child, cardId);
      }
    };
    const cardIds = shared.allCardIds();
    assert.ok(cardIds.length > 4_000);
    for (const cardId of cardIds) visit(modules.runtimeCompiledCard(cardId), cardId);
    assert.deepEqual(gains, []);
    assert.doesNotMatch(JSON.stringify(granted.GRANTED_EFFECT_LIBRARY), /"WhenDigivolving"/);
    const copied = cardIds.flatMap((cardId) =>
      [...JSON.stringify(modules.runtimeCompiledCard(cardId) ?? {}).matchAll(/"copyTrigger":"([^"]*)"/g)].map(
        ([, trigger]) => trigger,
      ),
    );
    assert.ok(!copied.some((trigger) => /digivolv/i.test(trigger)), copied.join());
  });

  it("gives EX13-064 no route that runs another card's effect under its own identity", () => {
    const kinds = [...JSON.stringify(modules.runtimeCompiledCard("EX13-064")).matchAll(/"kind":"([A-Za-z]+)"/g)].map(
      ([, kind]) => kind,
    );
    for (const route of ["ActivateForeignEffect", "ActivateEffect", "ReactivateEffect", "GainTriggeredEffect", "GainEffect", "GrantStatic"])
      assert.ok(!kinds.includes(route), route);
  });
});
