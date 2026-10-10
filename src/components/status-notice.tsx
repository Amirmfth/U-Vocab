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
    <div className={"status-notice status flex uv-vad50ebf4e9:flex items-start uv-vad50ebf4e9:items-start gap-2.5 uv-vad50ebf4e9:gap-2.5 uv-padding-e93fc48d3c uv-vad50ebf4e9:uv-padding-e93fc48d3c uv-border-8d7f82f403 uv-vad50ebf4e9:uv-border-8d7f82f403 rounded-uv-rd65225386d uv-vad50ebf4e9:rounded-uv-rd65225386d text-uv-f9601fe81a7 uv-vad50ebf4e9:text-uv-f9601fe81a7 uv-line-height-aa8f289ebe uv-vad50ebf4e9:uv-line-height-aa8f289ebe uv-v82421f58ba:text-uv-cf9ab83a8af uv-v82421f58ba:border-uv-c1c9917758e uv-v82421f58ba:bg-uv-cafddaf6a65 uv-vb9bc3d4b0a:text-uv-c7d351e814d uv-vb9bc3d4b0a:border-uv-cfc300cc991 uv-vb9bc3d4b0a:bg-uv-c8b3083dabe uv-ve729ba500e:text-uv-cc37489da12 uv-ve729ba500e:border-uv-c7978809be5 uv-ve729ba500e:bg-uv-cbdfd7cd038 uv-v75563057d5:inline-flex uv-v75563057d5:items-center uv-v75563057d5:gap-1.5 status-" + tone} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
