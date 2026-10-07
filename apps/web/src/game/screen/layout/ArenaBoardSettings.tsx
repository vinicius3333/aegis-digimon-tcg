/* Board display choices for the match dialog. They share their stores with the
   Settings screen, so a change here shows on the board behind the dialog at once. */

import { useId } from "react";
import { setPileCountsShown, usePileCountsShown } from "../../../design/pileCounts";
import { Switch } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";

export function ArenaBoardSettings() {
  const { t } = useTranslation();
  const titleId = useId();
  const pileCountsShown = usePileCountsShown();
  return (
    <section className="game-arena-board-settings" aria-labelledby={titleId}>
      <h3 id={titleId} className="game-arena-settings__title">
        {t("redesign.arena.board.title")}
      </h3>
      <div className="game-arena-settings__panel">
        <div className="game-arena-settings__row">
          <Switch
            checked={pileCountsShown}
            label={t("settings.pileCounts")}
            description={t("settings.pileCountsDesc")}
            onChange={setPileCountsShown}
          />
        </div>
      </div>
    </section>
  );
}
