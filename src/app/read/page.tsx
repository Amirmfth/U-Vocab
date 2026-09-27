import { permanentRedirect } from "next/navigation";

export default function LegacyReadingRedirect() {
  permanentRedirect("/reading");
}
