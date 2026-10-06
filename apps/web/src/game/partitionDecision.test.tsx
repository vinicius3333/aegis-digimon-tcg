// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DecisionResponse } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { DecisionOverlay } from "./overlay";

afterEach(cleanup);

it.each([true, false])(
  "Examon BT23 Partition shows both sources and explicitly accepts or declines, accepted=%s",
  (accepted) => {
    const onRespond = vi.fn<(response: DecisionResponse) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "oracle-dec-52",
            seat: 0,
            kind: "selectCards",
            promptText: "＜Partition＞: play the specified digivolution cards without paying their costs?",
            sourceCardId: "BT23-047",
            options: {
              candidateInstanceIds: ["ground"],
              visibleInstanceIds: ["ground", "wing"],
              min: 0,
              max: 1,
              selectionContext: "partitionActivation",
            },
          }}
          sourceCardId="BT23-047"
          candidates={[
            { instanceId: "ground", cardId: "BT20-042", selectable: true },
            { instanceId: "wing", cardId: "EX13-021", selectable: false },
          ]}
          picks={[]}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={onRespond}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("button", { name: "Confirm targets" })).toBeNull();
    expect(screen.queryByRole("button", { name: "None" })).toBeNull();
    expect(screen.getByRole("img", { name: "Groundramon" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Wingdramon" })).toBeTruthy();
    expect(onRespond).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: accepted ? "Yes, activate" : "No, decline" }));
    expect(onRespond).toHaveBeenCalledExactlyOnceWith({ kind: "selectCards", instanceIds: accepted ? ["ground"] : [] });
  },
);
