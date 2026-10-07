import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { abandonFocusSession, completeFocusStep } from "../actions";

export default async function FocusSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([
    params,
    getCurrentUser(),
    getCurrentCourse(),
  ]);

  const session = await db.learningSession.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!session) notFound();

  const active =
    session.items.find((item) => !item.completedAt) ??
    session.items.at(-1) ??
    null;

  return (
    <main className="page focus-page [display:flex] [flex-direction:column] [width:100%] [max-width:780px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{session.plannedMinutes}-minute focus</p>
        <h1>{session.status === "COMPLETED" ? "Session complete" : "Your learning plan"}</h1>
      </section>

      <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
        <ol className="history-list [display:flex] [flex-direction:column]">
          {session.items.map((item) => (
            <li className="history-row [min-height:42px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:8px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_small]:[color:var(--text-muted)] [&_small]:[text-align:right] [&.stacked]:[align-items:flex-start] [&.stacked]:[flex-direction:column] [&.stacked]:[gap:3px]" key={item.id}>
              <span>
                <strong>{item.title}</strong>
                {item.description ? <small>{item.description}</small> : null}
              </span>
              <small>{item.plannedMinutes} min {item.completedAt ? "· done" : ""}</small>
            </li>
          ))}
        </ol>
      </section>

      {session.status === "ACTIVE" && active ? (
        <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">Current segment</p>
          <h2>{active.title}</h2>
          <p className="muted [color:var(--text-muted)]">{active.description}</p>
          <div className="hero-actions [display:flex] [flex-direction:column] [gap:10px] [margin:6px_0_0] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[&_.button]:[width:auto]">
            <Link className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href={active.href}>Open activity</Link>
            <form action={completeFocusStep}>
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="itemId" value={active.id} />
              <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit">Mark complete</button>
            </form>
          </div>
        </section>
      ) : null}

      {session.status === "ACTIVE" ? (
        <form action={abandonFocusSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="text-button [min-height:38px] [display:inline-flex] [align-items:center] [gap:6px] [border:0] [background:transparent] [color:var(--text-muted)] [cursor:pointer]" type="submit">End session</button>
        </form>
      ) : (
        <Link className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href="/focus">Plan another session</Link>
      )}
    </main>
  );
}
