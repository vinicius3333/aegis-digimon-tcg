import type { AccountRole } from "@aegis/shared/account/AccountRole";
import { Icons, type IconComponent } from "@/design/icons";
import "@/account/roles/accountRoleBadge.css";

const roleIcons: Record<AccountRole, IconComponent> = {
  admin: Icons.ShieldCheck,
  judge: Icons.Flag,
  organizer: Icons.Trophy,
};

export function AccountRoleBadge({ role }: { role: AccountRole }) {
  const Icon = roleIcons[role];
  return (
    <span className="account-role-badge" data-role={role} aria-hidden="true">
      <Icon size={10} />
    </span>
  );
}
