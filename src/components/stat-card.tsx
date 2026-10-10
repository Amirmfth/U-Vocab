export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <article className="stat-card uv-border-8d7f82f403 uv-background-bfb621eb09 rounded-uv-r02a0a889dd uv-box-shadow-2853ca6bd8 p-4.25">
      <p className="stat-label text-uv-text-muted m-0 text-uv-f74fc13de71">{label}</p>
      <p className="stat-value uv-margin-ab8437355d uv-font-family-320794573f text-uv-f28f667fcee uv-line-height-356a192b79 uv-letter-spacing-52201352dd uv-font-variant-numeric-3032cae0ba">{value}</p>
      {detail ? <p className="stat-detail m-0 text-uv-f74fc13de71 text-uv-text-muted mt-2">{detail}</p> : null}
    </article>
  );
}
