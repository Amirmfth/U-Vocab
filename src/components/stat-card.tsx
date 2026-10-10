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
    <article className="stat-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur rounded-exact-radius-lg box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.25">
      <p className="stat-label text-uv-text-muted m-0 text-exact-0p76rem">{label}</p>
      <p className="stat-value margin-8px-0-2px font-font-geist-mono-geist-mono-monospace text-exact-1p75rem line-height-1 letter-spacing-0p05em-2 font-tabular-nums">{value}</p>
      {detail ? <p className="stat-detail m-0 text-exact-0p76rem text-uv-text-muted mt-2">{detail}</p> : null}
    </article>
  );
}
