// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CardInstance, PlayerState, assemblyRequirementFor } from "@aegis/shared";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { AssemblyMaterialOverlay, DigiXrosMaterialOverlay } from "./overlay";

import { prePlayPromptFor } from "./screen/model/prePlayPrompt";

afterEach(cleanup);
it.each([false, true])("#5413 Assembly displays the server's reduction prohibition (blocked=%s)", (blocked) => {
  const onConfirm = vi.fn<(materialInstanceIds: string[]) => void>();
  render(
    <I18nProvider>
      <AssemblyMaterialOverlay
        playingCardId="EX13-023"
        requirements={assemblyRequirementFor("EX13-023")!}
        playCostReductionBlocked={blocked}
        candidates={[
          { instanceId: "veemon", cardId: "EX13-017" },
          { instanceId: "veedramon", cardId: "EX13-019" },
          { instanceId: "aero", cardId: "EX13-022" },
        ]}
        onConfirm={onConfirm}
        onSkip={vi.fn<() => void>()}
      />
    </I18nProvider>,
  );
  const t = translator("en");
  expect(
    screen.getByText(t("overlay.assemblyDetail", { reduction: blocked ? 0 : 5, cost: blocked ? 12 : 7 }), {
      exact: false,
    }),
  ).toBeTruthy();
  for (const name of ["Veemon", "Veedramon", "AeroVeedramon"])
    fireEvent.click(screen.getByRole("button", { name: `${name} (trash)` }));
  fireEvent.click(screen.getByRole("button", { name: /Assembly \(3/ }));
  expect(onConfirm).toHaveBeenCalledWith(["veemon", "veedramon", "aero"]);
});

it("#5413 DigiXros forwards a hand-card cost prohibition into the real material prompt", () => {
  const viewer = new PlayerState();
  viewer.hand.push(Object.assign(new CardInstance(), { instanceId: "ignite", cardId: "BT11-076" }));
  const prompt = prePlayPromptFor({
    entry: {
      instanceId: "merva",
      cardId: "BT11-086",
      activatableEffectsJson: "",
      playableFromHand: true,
      projectedPlayCost: 11,
      playCostReductionBlocked: true,
      digivolveTargetPermanentIds: [],
      linkTargetPermanentIds: [],
    },
    viewer,
    confirmDrop: false,
    actionConfirmationsEnabled: false,
  });
  if (prompt?.kind !== "digiXros") throw new Error("Expected DigiXros");
  expect(prompt.playCostReductionBlocked).toBe(true);
  render(
    <I18nProvider>
      <DigiXrosMaterialOverlay
        {...prompt}
        playingCardId={prompt.cardId}
        onConfirm={vi.fn<(materialInstanceIds: string[], expanderPermanentIds: string[]) => void>()}
        onSkip={vi.fn<() => void>()}
      />
    </I18nProvider>,
  );
  const t = translator("en");
  expect(
    screen.getByText(t("overlay.xrosDetail", { reduction: t("overlay.xrosReductionPerPlaced", { count: 0 }) }), {
      exact: false,
    }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ignitemon (hand)" }).hasAttribute("disabled")).toBe(false);
});
