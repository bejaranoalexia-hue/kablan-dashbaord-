import type { User } from "../types";

const COLORS = ["bg-teal-600", "bg-orange-500", "bg-fuchsia-600", "bg-blue-600", "bg-lime-600"];

export function Avatar({ user, size = "sm" }: { user: User | undefined; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  if (!user) {
    return (
      <span
        className={`${dims} inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400`}
      >
        ?
      </span>
    );
  }
  const color = COLORS[user.id.charCodeAt(user.id.length - 1) % COLORS.length];
  return (
    <span className={`${dims} ${color} inline-flex items-center justify-center rounded-full font-semibold text-white`}>
      {user.initials}
    </span>
  );
}
