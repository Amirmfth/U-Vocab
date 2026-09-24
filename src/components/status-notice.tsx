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
    <div className={"status-notice status-" + tone} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
