import { CheckCircle2, CircleAlert, Info } from "lucide-react";

export function StatusNotice({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? CircleAlert : Info;

  return (
    <div className={"status-notice status flex in-status-notice-2:flex items-start in-status-notice-2:items-start gap-2.5 in-status-notice-2:gap-2.5 padding-13px-14px in-status-notice-2:padding-13px-14px border-1px-solid-border-2 in-status-notice-2:border-1px-solid-border-2 rounded-exact-14px in-status-notice-2:rounded-exact-14px text-exact-0p86rem in-status-notice-2:text-exact-0p86rem line-height-1p5 in-status-notice-2:line-height-1p5 in-status-success:text-uv-cf9ab83a8af in-status-success:border-uv-c1c9917758e in-status-success:bg-uv-cafddaf6a65 in-status-error:text-uv-c7d351e814d in-status-error:border-uv-cfc300cc991 in-status-error:bg-uv-c8b3083dabe in-status-info:text-uv-cc37489da12 in-status-info:border-uv-c7978809be5 in-status-info:bg-uv-cbdfd7cd038 in-status-link:inline-flex in-status-link:items-center in-status-link:gap-1.5 status-" + tone} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
