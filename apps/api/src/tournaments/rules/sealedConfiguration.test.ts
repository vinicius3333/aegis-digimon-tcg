import { expect, it } from "vitest";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { parseCreateTournament } from "#api/tournaments/rules/parseCreateTournament";
import { validateCreateTournament } from "#api/tournaments/rules/validation";

const body = {
  name: "Sealed Swiss",
  startsAt: Date.now() + 10000,
  maxPlayers: 8,
  structure: "swiss",
  sealedConfiguration: getSealedConfiguration({ setId: "BT4" }),
};
it("defaults sealed creation to BO3 and leaves BO1 rejection to validation", () => {
  expect(parseCreateTournament(body)?.input.bestOf).toBe(3);
  expect(validateCreateTournament(parseCreateTournament({ ...body, bestOf: 1 })!.input, Date.now()).ok).toBe(false);
});
it("refuses sealed BO1 and omitted match format at domain validation", () => {
  const parsed = parseCreateTournament({ ...body, bestOf: 3 })!;
  expect(validateCreateTournament({ ...parsed.input, bestOf: 1 }, Date.now()).ok).toBe(false);
  expect(validateCreateTournament({ ...parsed.input, bestOf: undefined } as never, Date.now()).ok).toBe(false);
  expect(validateCreateTournament(parsed.input, Date.now()).ok).toBe(true);
});

it.each(["BT4", "EX13", "BT26"])("accepts frozen %s configuration through parsing and domain validation", (setId) => {
  const config = getSealedConfiguration({ setId });
  const parsed = parseCreateTournament({ ...body, sealedConfiguration: config });
  expect(parsed?.input.sealedConfiguration).toEqual(config);
  expect(validateCreateTournament(parsed!.input, Date.now()).ok).toBe(true);
});

it.each(["BT27", "unknown", "constructor"])("rejects forged %s configuration at the domain boundary", (setId) => {
  const config = { ...body.sealedConfiguration, setId };
  const parsed = parseCreateTournament({ ...body, sealedConfiguration: config })!;
  expect(validateCreateTournament(parsed.input, Date.now()).ok).toBe(false);
});

it.each(["alysion", "alysion:pauper", "alysion:unlimited"] as const)(
  "keeps %s constructed with its own banlist and rejects a sealed configuration",
  (format) => {
    const parsed = parseCreateTournament({
      ...body,
      sealedConfiguration: undefined,
      format,
      banlist: { mode: "alysion" },
    });
    expect(parsed).toBeDefined();
    if (!parsed) {
      throw new Error("expected parsed Alysion creation");
    }
    const result = validateCreateTournament(parsed.input, Date.now());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected valid Alysion creation");
    }
    expect(result.value.settings.format).toBe(format);
    expect(result.value.input.sealedConfiguration).toBeUndefined();
    expect(result.value.input.banlist).toEqual({ mode: "alysion" });
    for (const mode of ["none", "current", "as_of_set"] as const) {
      const banlist = mode === "as_of_set" ? { mode, setId: "BT4" } : { mode };
      const rejected = validateCreateTournament({ ...parsed.input, banlist }, Date.now());
      expect(rejected.ok).toBe(false);
      if (rejected.ok) {
        throw new Error("expected mismatched Alysion banlist rejection");
      }
      expect(rejected.errors).toContainEqual(
        expect.objectContaining({ code: "banlist_mode_unknown", field: "banlist" }),
      );
    }
    const sealed = validateCreateTournament(
      { ...parsed.input, sealedConfiguration: body.sealedConfiguration },
      Date.now(),
    );
    expect(sealed).toEqual({
      ok: false,
      errors: [{ code: "sealed_configuration_invalid", field: "sealedConfiguration" }],
    });
  },
);

it("detaches the validated configuration from caller-owned data", () => {
  const config = { ...body.sealedConfiguration, untrusted: true };
  const parsed = parseCreateTournament({ ...body, sealedConfiguration: config })!;
  const result = validateCreateTournament(parsed.input, Date.now());
  if (!result.ok) throw new Error("expected valid configuration");
  config.buildMinutes++;
  expect(result.value.input.sealedConfiguration).toEqual(body.sealedConfiguration);
  expect(Object.isFrozen(result.value.input.sealedConfiguration)).toBe(true);
});
