type FieldRule = (value: unknown) => boolean;

const text: FieldRule = (value) => typeof value === "string";
const flag: FieldRule = (value) => typeof value === "boolean";
const count: FieldRule = (value) => typeof value === "number" && Number.isFinite(value);
const textList: FieldRule = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string");
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const optional =
  (rule: FieldRule): FieldRule =>
  (value) =>
    value === undefined || value === null || rule(value);
const shaped =
  (rules: Record<string, FieldRule>): FieldRule =>
  (value) =>
    record(value) && Object.entries(rules).every(([key, rule]) => rule(value[key]));

const attackTarget: FieldRule = (value) =>
  record(value) && (value.kind === "player" || (value.kind === "permanent" && text(value.permanentId)));
const decisionResponse: FieldRule = (value) => record(value) && text(value.kind);

const INTENT_FIELDS: Record<string, Record<string, FieldRule>> = {
  ready: {},
  mulligan: { keep: flag },
  playCard: {
    instanceId: text,
    useAs: optional((value) => value === "digimon" || value === "option"),
    targetSlot: optional(count),
    digiXros: optional(
      shaped({
        materialInstanceIds: textList,
        expanderPermanentIds: optional(textList),
        underTamerHostPermanentId: optional(text),
      }),
    ),
    assembly: optional(shaped({ materialInstanceIds: textList })),
  },
  appFusion: { permanentId: text, instanceId: text, linkedInstanceId: text },
  digivolve: {
    permanentId: text,
    instanceId: text,
    useAlternateCost: optional(flag),
    appFusionLinkedInstanceId: optional(text),
    alternateRequirementIndex: optional(count),
    useBlastDigivolve: optional(flag),
    appFusionLinkInstanceId: optional(text),
  },
  hatchEgg: {},
  moveFromBreeding: { permanentId: text },
  activateEffect: { sourceInstanceId: text, effectKey: text },
  linkCard: { instanceId: text, targetPermanentId: text },
  dnaDigivolve: { materialPermanentIds: textList, instanceId: text, useBlastDigivolve: optional(flag) },
  endPhase: {},
  attack: { attackerPermanentId: text, target: attackTarget, vortex: optional(flag) },
  declareBlock: { blockerPermanentId: text },
  declineBlock: {},
  respondCounter: { sourceInstanceId: optional(text), effectKey: optional(text) },
  respondAlliance: { allyPermanentId: optional(text) },
  respondEvade: { permanentId: text, accept: flag },
  respondBarrier: { permanentId: text, accept: flag },
  respondDecision: { decisionId: text, response: decisionResponse },
  surrender: {},
  showNothingToDoPrompts: { show: flag },
};

export function isWellFormedIntent(intent: unknown): boolean {
  if (!record(intent) || typeof intent.type !== "string") return false;
  const rules: Record<string, FieldRule> | undefined = INTENT_FIELDS[intent.type];
  if (rules === undefined) return true;
  return Object.entries(rules).every(([key, rule]) => rule(intent[key]));
}
