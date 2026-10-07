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
    <div className={"status-notice status [display:flex] [&.status-notice]:[display:flex] [align-items:flex-start] [&.status-notice]:[align-items:flex-start] [gap:10px] [&.status-notice]:[gap:10px] [padding:13px_14px] [&.status-notice]:[padding:13px_14px] [border:1px_solid_var(--border)] [&.status-notice]:[border:1px_solid_var(--border)] [border-radius:14px] [&.status-notice]:[border-radius:14px] [font-size:0.86rem] [&.status-notice]:[font-size:0.86rem] [line-height:1.5] [&.status-notice]:[line-height:1.5] [&.status-success]:[color:#b8f2d4] [&.status-success]:[border-color:rgba(73,_201,_139,_0.24)] [&.status-success]:[background:var(--success-soft)] [&.status-error]:[color:#ffc2c9] [&.status-error]:[border-color:rgba(255,_107,_122,_0.24)] [&.status-error]:[background:var(--danger-soft)] [&.status-info]:[color:#cec9ff] [&.status-info]:[border-color:rgba(139,_124,_255,_0.24)] [&.status-info]:[background:var(--primary-soft)] [&.status-link]:[display:inline-flex] [&.status-link]:[align-items:center] [&.status-link]:[gap:6px] status-" + tone} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
