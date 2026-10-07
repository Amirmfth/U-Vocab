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
    <article className="stat-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [border-radius:var(--radius-lg)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:17px]">
      <p className="stat-label [color:var(--text-muted)] [margin:0] [font-size:0.76rem]">{label}</p>
      <p className="stat-value [margin:8px_0_2px] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:1.75rem] [line-height:1] [letter-spacing:-0.05em] [font-variant-numeric:tabular-nums]">{value}</p>
      {detail ? <p className="stat-detail [margin:0] [font-size:0.76rem] [color:var(--text-muted)] [margin-top:8px]">{detail}</p> : null}
    </article>
  );
}
