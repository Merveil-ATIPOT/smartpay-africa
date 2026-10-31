import { userInitials } from "../../lib/userDetail";

type UserAvatarProps = {
  first_name: string;
  last_name: string;
  size?: "sm" | "lg";
};

export function UserAvatar({ first_name, last_name, size = "sm" }: UserAvatarProps) {
  const initials = userInitials({ first_name, last_name });
  const box =
    size === "lg"
      ? "h-16 w-16 rounded-2xl bg-gradient-to-br from-navy to-[#565E71] text-xl shadow-md"
      : "h-10 w-10 rounded-full bg-navy text-sm";
  const icon = size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <div className={`flex shrink-0 items-center justify-center font-display font-semibold text-white ${box}`} aria-hidden>

      {initials ?? (
        <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      )}
    </div>
  );
}
