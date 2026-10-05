// Expert label for one actual effect DigiXros precursor: the free play offered by
// EX13-064 LordKnightmon's [When Digivolving], when DarkKnightmon can take a material
// from its controller's hand. Every other decision is the qualified training teacher's.
// The qualified engine, teacher, material labels and fixed opponent are imported
// unchanged from the qualified API dist; nothing here is copied into or patched in it.
import { realpathSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

export const QUALIFIED_ROOT = "/home/vinicius/aegis-bot-lab/checkouts/material-teacher-1cec011c0";
/** Local synthetic tests only. Production admission requires this to be unset. */
export const QUALIFIED_ROOT_OVERRIDE = "AEGIS_QUALIFIED_ROOT";

export const SOURCE_CARD_ID = "EX13-064";
export const SOURCE_TIMING = "WhenDigivolving";
export const DIGIXROS_CARD_IDS = new Set(["EX10-031"]);

/** The qualified compiled IR of EX13-064's merged play/use pick, pinned exactly. */
export const QUALIFIED_PLAY_ACTION = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      kind: ["Digimon", "Tamer", "Option"],
      playCostLte: 8,
      nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
    },
    count: 1,
    upTo: true,
    minimum: 0,
  },
  from: ["hand", "trash"],
  payCost: false,
  optional: false,
  raw: "You may play 1 play cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost",
  chooseDualMode: true,
};

// Public request options this pick may carry. Any other defined option (purpose,
// isInherited, material or budget fields, targetFate, ...) makes the request unsafe.
// effectText is tolerated as present but never read.
const PERMITTED_OPTIONS = new Set([
  "candidateInstanceIds",
  "visibleInstanceIds",
  "visibleCards",
  "min",
  "max",
  "differentColors",
  "timing",
  "effectText",
  "effectTextPart",
]);

export function qualifiedApiDist(env = process.env) {
  const root = env[QUALIFIED_ROOT_OVERRIDE] ?? QUALIFIED_ROOT;
  // An empty or relative override would silently resolve against the working directory.
  if (!isAbsolute(root)) throw new Error(`${QUALIFIED_ROOT_OVERRIDE} must be an absolute path`);
  return realpathSync(join(root, "apps/api/dist"));
}

export async function loadQualifiedModules(apiDist) {
  const load = (path) => import(pathToFileURL(realpathSync(join(apiDist, path))).href);
  const [shared, interpreter, modal, matching, digiXros, evaluate, profiles, observation, reference] =
    await Promise.all([
      load("../node_modules/@aegis/shared/dist/index.js"),
      load("engine/effects/interpreter.js"),
      load("engine/effects/interpreter/actions/modal.js"),
      load("engine/effects/interpreter/matching/definition.js"),
      load("engine/actions/digiXros.js"),
      load("bot/evaluate.js"),
      load("bot/profiles.js"),
      load("bot/training/observation.js"),
      load("bot/training/referencePolicy.js"),
    ]);
  return {
    getCardDefinition: shared.getCardDefinition,
    digiXrosRequirementFor: shared.digiXrosRequirementFor,
    runtimeCompiledCard: interpreter.runtimeCompiledCard,
    mergedPlayOrUseAction: modal.mergedPlayOrUseAction,
    definitionMatches: matching.definitionMatches,
    materialsSatisfyRecipe: digiXros.materialsSatisfyRecipe,
    scoreCandidate: evaluate.scoreCandidate,
    defaultProfile: profiles.DEFAULT_BOT_PROFILE,
    trainingObservation: observation.trainingObservation,
    createTrainingTeacher: reference.createTrainingTeacher,
  };
}

/** The qualified merged play action, or undefined when the registered IR is not the pinned shape. */
function qualifiedPlayAction(modules) {
  const effects = (modules.runtimeCompiledCard(SOURCE_CARD_ID)?.effects ?? []).filter(
    (effect) => effect.trigger === SOURCE_TIMING,
  );
  const [effect] = effects;
  if (
    effects.length !== 1 ||
    effect.isInherited === true ||
    effect.isLinked === true ||
    effect.isSecurity === true ||
    effect.optional === true ||
    effect.cost !== undefined ||
    effect.condition !== undefined ||
    effect.actions.length !== 1 ||
    effect.actions[0].kind !== "Modal"
  )
    return undefined;
  const play = modules.mergedPlayOrUseAction(effect.actions[0]);
  return isDeepStrictEqual(JSON.parse(JSON.stringify(play ?? null)), QUALIFIED_PLAY_ACTION) ? play : undefined;
}

/**
 * Free DarkKnightmon plays in this request whose DigiXros recipe one current own hand card
 * satisfies. Undefined means the request is not EX13-064's own merged pick on its own public
 * top card, or not every offered card is an own hand/trash Digimon or Tamer accepted by the
 * engine's filter matcher; the qualified teacher then answers unchanged.
 */
export function effectDigiXrosCandidates(modules, observation, request) {
  const options = request.options;
  if (
    request.kind !== "selectCards" ||
    request.seat !== observation.seat ||
    request.sourceCardId !== SOURCE_CARD_ID ||
    typeof request.sourceInstanceId !== "string" ||
    typeof request.sourcePermanentId !== "string" ||
    options === undefined ||
    Object.entries(options).some(([key, value]) => value !== undefined && !PERMITTED_OPTIONS.has(key)) ||
    options.min !== 0 ||
    options.max !== 1 ||
    options.timing !== SOURCE_TIMING ||
    options.differentColors === true
  )
    return undefined;
  const own = observation.players.find((player) => player.seat === observation.seat);
  const source = own?.board.find((unit) => unit.permanentId === request.sourcePermanentId);
  if (
    source === undefined ||
    source.inBreeding ||
    source.top.instanceId !== request.sourceInstanceId ||
    source.top.cardId !== SOURCE_CARD_ID ||
    source.top.ownerSeat !== observation.seat
  )
    return undefined;
  const play = qualifiedPlayAction(modules);
  if (play === undefined) return undefined;

  const zones = new Map([...own.hand, ...own.trash].map((card) => [card.instanceId, card]));
  const offered = options.candidateInstanceIds ?? [];
  if (offered.length === 0 || new Set(offered).size !== offered.length) return undefined;
  const pool = [];
  for (const instanceId of offered) {
    const card = zones.get(instanceId);
    const definition = card?.cardId === undefined ? undefined : modules.getCardDefinition(card.cardId);
    if (
      definition === undefined ||
      card.ownerSeat !== observation.seat ||
      definition.kinds.includes("Option") ||
      !modules.definitionMatches(play.target.filter, definition)
    )
      return undefined;
    pool.push({ instanceId, definition });
  }
  return pool.filter(({ instanceId, definition }) => {
    const recipe = DIGIXROS_CARD_IDS.has(definition.cardId)
      ? modules.digiXrosRequirementFor(definition.cardId)?.[0]
      : undefined;
    return (
      recipe !== undefined &&
      own.hand.some((material) => {
        if (
          material.instanceId === instanceId ||
          material.ownerSeat !== observation.seat ||
          material.cardId === undefined
        )
          return false;
        const materialDefinition = modules.getCardDefinition(material.cardId);
        return (
          materialDefinition !== undefined && modules.materialsSatisfyRecipe([materialDefinition], recipe.materials)
        );
      })
    );
  });
}

/** Highest positive score wins; offer order breaks ties. */
export function rankEffectDigiXros(candidates, score) {
  let best;
  for (const candidate of candidates) {
    const value = score(candidate);
    if (value > 0 && (best === undefined || value > best.value)) best = { instanceId: candidate.instanceId, value };
  }
  return best?.instanceId;
}

export function createEffectPlayTeacherFactory(modules) {
  return (engine, seat, seed) => {
    const teacher = modules.createTrainingTeacher(engine, seat, seed);
    return {
      ...teacher,
      answerDecision(view, request, signal) {
        if (
          view === undefined ||
          request.seat !== seat ||
          engine.state.pendingDecision?.decisionId !== request.decisionId
        )
          return teacher.answerDecision(view, request, signal);
        const candidates = effectDigiXrosCandidates(
          modules,
          modules.trainingObservation(engine.state, seat, request),
          request,
        );
        const chosen =
          candidates === undefined
            ? undefined
            : rankEffectDigiXros(candidates, ({ instanceId, definition }) =>
                modules.scoreCandidate(
                  view,
                  {
                    kind: "playDigimon",
                    key: `effectPlay:${instanceId}`,
                    intent: { type: "playCard", instanceId },
                    cost: 0,
                    definition,
                  },
                  modules.defaultProfile,
                ),
              );
        if (chosen === undefined) return teacher.answerDecision(view, request, signal);
        return {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: [chosen] },
        };
      },
    };
  };
}
