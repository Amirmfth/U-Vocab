import Link from "next/link";
import { LexemeReviewState, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import {
  addAliasAction,
  mergeLexemeAction,
  removeAliasAction,
  reviewLexemeAction,
  updateLexemeAction,
} from "../actions";

const PAGE_SIZE = 12;

export default async function AdminLexiconPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; review?: string; page?: string }>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
  const search = q.q?.trim();
  const review = Object.values(LexemeReviewState).includes(q.review as LexemeReviewState)
    ? (q.review as LexemeReviewState)
    : null;
  const where: Prisma.LexemeWhereInput = {
    ...(search ? {
      OR: [
        { lemma: { contains: search, mode: "insensitive" } },
        { normalized: { contains: search, mode: "insensitive" } },
        { aliases: { some: { normalizedSurface: { contains: search, mode: "insensitive" } } } },
      ],
    } : {}),
    ...(review ? { OR: [{ provenance: { some: { reviewState: review } } }, { senses: { some: { reviewState: review } } }] } : {}),
  };

  const [total, lexemes, duplicates, collisions] = await Promise.all([
    db.lexeme.count({ where }),
    db.lexeme.findMany({
      where,
      include: {
        aliases: { orderBy: { createdAt: "asc" }, take: 20 },
        senses: { orderBy: { createdAt: "asc" }, take: 12, include: { translations: { take: 12 }, definitions: { take: 12 } } },
        provenance: { orderBy: { createdAt: "desc" }, take: 8 },
        translations: { take: 12 },
        examples: { take: 4 },
        patterns: { take: 6 },
        _count: { select: { userStates: true, encounters: true, mistakes: true } },
      },
      orderBy: [{ canonicalUpdatedAt: "desc" }, { lemma: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.$queryRaw<Array<{ language: string; normalized: string; partOfSpeech: string; count: bigint }>>`
      SELECT "language", lower(trim("normalized")) AS normalized, "partOfSpeech"::text AS "partOfSpeech", COUNT(*)::bigint AS count
      FROM "Lexeme"
      GROUP BY "language", lower(trim("normalized")), "partOfSpeech"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `,
    db.$queryRaw<Array<{ language: string; normalizedSurface: string; lexemeCount: bigint }>>`
      SELECT "language", "normalizedSurface", COUNT(DISTINCT "lexemeId")::bigint AS "lexemeCount"
      FROM "LexemeAlias"
      GROUP BY "language", "normalizedSurface"
      HAVING COUNT(DISTINCT "lexemeId") > 1
      ORDER BY "lexemeCount" DESC
      LIMIT 20
    `,
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
    <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">SHARED DATA</p><h1>Lexicon maintenance</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">Curate canonical shared lexical data. Learner-private content is not exposed here.</p></section>
    <form className="panel admin-filter-bar [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [margin-bottom:1rem] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem] [border-radius:18px]" method="get">
      <input name="q" defaultValue={q.q} placeholder="Lemma, canonical form, or alias"/>
      <select name="review" defaultValue={q.review ?? ""}><option value="">All review states</option>{Object.values(LexemeReviewState).map((x)=><option key={x}>{x}</option>)}</select>
      <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">Filter</button>
    </form>

    <section className="admin-two-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Probable canonical duplicates</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{duplicates.map((x)=><div key={x.language+x.normalized+x.partOfSpeech}><strong>{x.normalized}</strong><span>{x.language} · {x.partOfSpeech}</span><b>{Number(x.count)} records</b></div>)}{!duplicates.length?<p className="muted [color:var(--text-muted)]">No canonical duplicate keys detected.</p>:null}</div></article>
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Alias collisions</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{collisions.map((x)=><div key={x.language+x.normalizedSurface}><strong>{x.normalizedSurface}</strong><span>{x.language}</span><b>{Number(x.lexemeCount)} lexemes</b></div>)}{!collisions.length?<p className="muted [color:var(--text-muted)]">No cross-lexeme alias collisions detected.</p>:null}</div></article>
    </section>

    <section className="panel admin-danger-zone [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-style:dashed] [margin-bottom:1rem] [border-radius:18px]">
      <h2>Merge duplicate lexemes</h2>
      <p className="muted [color:var(--text-muted)]">The source is repointed transactionally into the target before the source record is deleted.</p>
      <form action={mergeLexemeAction} className="admin-inline-form [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem]">
        <input name="sourceLexemeId" placeholder="Source lexeme ID" required/>
        <input name="targetLexemeId" placeholder="Target lexeme ID" required/>
        <ConfirmSubmitButton className="button button-danger [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [background:var(--danger)] [&.button-danger]:[color:#19070a] [color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [border-color:currentColor] [min-height:var(--tap-target)]" message="Merge the source lexeme into the target? This rewrites dependent records and cannot be undone automatically.">Merge lexemes</ConfirmSubmitButton>
      </form>
    </section>

    <div className="admin-lexeme-list [display:grid] [gap:1rem]">
      {lexemes.map((lexeme)=><article className="panel admin-lexeme-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [overflow:hidden] [border-radius:18px]" key={lexeme.id}>
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]"><div><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{lexeme.language} · {lexeme.partOfSpeech}</p><h2>{lexeme.article ? lexeme.article+" " : ""}{lexeme.lemma}</h2><span className="muted [color:var(--text-muted)]">{lexeme.id} · {lexeme.normalized} · {lexeme._count.userStates} learners</span></div><div>{lexeme.provenance[0]?.reviewState ?? lexeme.senses[0]?.reviewState ?? "UNREVIEWED"}</div></div>

        <form action={updateLexemeAction} className="admin-grid-form [gap:.7rem] [flex-wrap:wrap] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem] [&_label]:[display:grid] [&_label]:[gap:.3rem] [&_label]:[font-size:.8rem] [&_label]:[color:var(--muted)] [display:grid] [grid-template-columns:repeat(auto-fit,_minmax(145px,_1fr))] [align-items:end] [margin:1rem_0]">
          <input type="hidden" name="lexemeId" value={lexeme.id}/>
          <label>Lemma<input name="lemma" defaultValue={lexeme.lemma} required/></label>
          <label>Article<input name="article" defaultValue={lexeme.article ?? ""}/></label>
          <label>Plural<input name="plural" defaultValue={lexeme.plural ?? ""}/></label>
          <label>Gender<input name="gender" defaultValue={lexeme.gender ?? ""}/></label>
          <label>CEFR<input name="cefrLevel" defaultValue={lexeme.cefrLevel ?? ""}/></label>
          <label>Part of speech<select name="partOfSpeech" defaultValue={lexeme.partOfSpeech}>{["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","PHRASE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
          <ConfirmSubmitButton message="Save canonical lexeme changes?">Save canonical data</ConfirmSubmitButton>
        </form>

        <div className="admin-three-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(3,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
          <section><h3>Aliases</h3><div className="admin-chip-list [display:flex] [flex-wrap:wrap] [gap:.4rem] [margin-bottom:.65rem]">{lexeme.aliases.map((alias)=><form action={removeAliasAction} key={alias.id} className="admin-chip [display:inline-flex] [align-items:center] [gap:.35rem] [padding:.28rem_.45rem_.28rem_.6rem] [border:1px_solid_var(--border)] [border-radius:999px] [font-size:.78rem]"><input type="hidden" name="aliasId" value={alias.id}/><span>{alias.surface} · {alias.kind}</span><ConfirmSubmitButton className="admin-chip-delete [border:0] [background:transparent] [color:inherit] [cursor:pointer] [font-size:1rem]" message={"Remove alias “"+alias.surface+"”?"}>×</ConfirmSubmitButton></form>)}</div><form action={addAliasAction} className="admin-inline-form [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem]"><input type="hidden" name="lexemeId" value={lexeme.id}/><input name="surface" placeholder="New alias" required/><select name="kind" defaultValue="SPELLING_VARIANT">{["USER_INPUT","ARTICLE_VARIANT","SPELLING_VARIANT","INFLECTED_FORM","IMPORTED","GENERATED"].map(x=><option key={x}>{x}</option>)}</select><button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">Add</button></form></section>
          <section><h3>Senses, definitions & translations</h3>{lexeme.senses.map((sense)=><div className="admin-data-block [display:grid] [gap:.2rem] [padding:.55rem_0] [border-top:1px_solid_var(--border)] [font-size:.84rem] [&_span]:[color:var(--muted)] [&_small]:[color:var(--muted)]" key={sense.id}><strong>{sense.key} · {sense.reviewState}</strong><span>{sense.gloss ?? "No gloss"}</span><small>{[...sense.definitions.map(d=>"definition "+d.language+": "+d.text),...sense.translations.map(t=>t.language+": "+t.text)].join(" · ") || "No semantic data"}</small></div>)}</section>
          <section><h3>Provenance</h3>{lexeme.provenance.map((p)=><div className="admin-data-block [display:grid] [gap:.2rem] [padding:.55rem_0] [border-top:1px_solid_var(--border)] [font-size:.84rem] [&_span]:[color:var(--muted)] [&_small]:[color:var(--muted)]" key={p.id}><strong>{p.source} · {p.reviewState}</strong><span>{p.provider ?? "—"} / {p.model ?? "—"}</span><small>{p.promptVersion ?? "no prompt version"} · {p.contentVersion ?? "no content version"}</small></div>)}</section>
        </div>

        <div className="admin-two-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
          <section><h3>Patterns</h3>{lexeme.patterns.map(p=><div className="admin-data-block [display:grid] [gap:.2rem] [padding:.55rem_0] [border-top:1px_solid_var(--border)] [font-size:.84rem] [&_span]:[color:var(--muted)] [&_small]:[color:var(--muted)]" key={p.id}>{p.pattern}</div>)}<h3>Examples</h3>{lexeme.examples.map(e=><div className="admin-data-block [display:grid] [gap:.2rem] [padding:.55rem_0] [border-top:1px_solid_var(--border)] [font-size:.84rem] [&_span]:[color:var(--muted)] [&_small]:[color:var(--muted)]" key={e.id}><strong>{e.targetText}</strong><span>{e.english ?? e.persian ?? ""}</span></div>)}</section>
          <section><h3>Review state</h3><form action={reviewLexemeAction} className="admin-inline-form [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem]"><input type="hidden" name="lexemeId" value={lexeme.id}/><select name="reviewState" defaultValue={lexeme.provenance[0]?.reviewState ?? "ACCEPTED"}>{Object.values(LexemeReviewState).map(x=><option key={x}>{x}</option>)}</select><ConfirmSubmitButton message="Change curated review state for this lexeme?">Apply state</ConfirmSubmitButton></form><p className="muted [color:var(--text-muted)]">{lexeme._count.encounters} encounters · {lexeme._count.mistakes} linked mistake records</p></section>
        </div>
      </article>)}
    </div>
    <nav className="admin-pagination [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [margin:1rem_0] [color:var(--muted)] [&_>_:last-child]:[text-align:right]"><span>{page>1?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page-1}}}>Previous</Link>:null}</span><span>Page {page} of {pages} · {total} lexemes</span><span>{page<pages?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page+1}}}>Next</Link>:null}</span></nav>
  </main>;
}
