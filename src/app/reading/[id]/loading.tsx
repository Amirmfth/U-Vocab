import { RouteLoading } from "@/components/route-loading";

export default function Loading() {
  return <RouteLoading variant="reading-detail [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px]" />;
}
