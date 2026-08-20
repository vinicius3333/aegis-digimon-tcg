/* The always-available entry point to the bug-report modal. Rendered by the app shell so a player
   can report from whatever screen the bug appeared on. */

import { useState } from "react";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { BugReportDialog } from "./BugReportDialog";
import "./bugReports.css";

export function BugReportButton({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="bug-report-button" onClick={() => setOpen(true)}>
        <Icons.Bug size={18} />
        <span>{t("bugReport.button")}</span>
      </button>
      {open ? <BugReportDialog signedIn={signedIn} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
