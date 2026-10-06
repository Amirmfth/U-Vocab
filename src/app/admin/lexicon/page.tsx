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

  return <main className="page admin-page">
    <section className="page-header compact"><p className="eyebrow">SHARED DATA</p><h1>Lexicon maintenance</h1><p className="page-description">Curate canonical shared lexical data. Learner-private content is not exposed here.</p></section>
    <form className="panel admin-filter-bar" method="get">
      <input name="q" defaultValue={q.q} placeholder="Lemma, canonical form, or alias"/>
      <select name="review" defaultValue={q.review ?? ""}><option value="">All review states</option>{Object.values(LexemeReviewState).map((x)=><option key={x}>{x}</option>)}</select>
      <button className="button button-primary">Filter</button>
    </form>

    <section className="admin-two-column">
      <article className="panel"><h2>Probable canonical duplicates</h2><div className="admin-table-list">{duplicates.map((x)=><div key={x.language+x.normalized+x.partOfSpeech}><strong>{x.normalized}</strong><span>{x.language} · {x.partOfSpeech}</span><b>{Number(x.count)} records</b></div>)}{!duplicates.length?<p className="muted">No canonical duplicate keys detected.</p>:null}</div></article>
      <article className="panel"><h2>Alias collisions</h2><div className="admin-table-list">{collisions.map((x)=><div key={x.language+x.normalizedSurface}><strong>{x.normalizedSurface}</strong><span>{x.language}</span><b>{Number(x.lexemeCount)} lexemes</b></div>)}{!collisions.length?<p className="muted">No cross-lexeme alias collisions detected.</p>:null}</div></article>
    </section>

    <section className="panel admin-danger-zone">
      <h2>Merge duplicate lexemes</h2>
      <p className="muted">The source is repointed transactionally into the target before the source record is deleted.</p>
      <form action={mergeLexemeAction} className="admin-inline-form">
        <input name="sourceLexemeId" placeholder="Source lexeme ID" required/>
        <input name="targetLexemeId" placeholder="Target lexeme ID" required/>
        <ConfirmSubmitButton className="button button-danger" message="Merge the source lexeme into the target? This rewrites dependent records and cannot be undone automatically.">Merge lexemes</ConfirmSubmitButton>
      </form>
    </section>

    <div className="admin-lexeme-list">
      {lexemes.map((lexeme)=><article className="panel admin-lexeme-card" key={lexeme.id}>
        <div className="section-heading"><div><p className="eyebrow">{lexeme.language} · {lexeme.partOfSpeech}</p><h2>{lexeme.article ? lexeme.article+" " : ""}{lexeme.lemma}</h2><span className="muted">{lexeme.id} · {lexeme.normalized} · {lexeme._count.userStates} learners</span></div><div>{lexeme.provenance[0]?.reviewState ?? lexeme.senses[0]?.reviewState ?? "UNREVIEWED"}</div></div>

        <form action={updateLexemeAction} className="admin-grid-form">
          <input type="hidden" name="lexemeId" value={lexeme.id}/>
          <label>Lemma<input name="lemma" defaultValue={lexeme.lemma} required/></label>
          <label>Article<input name="article" defaultValue={lexeme.article ?? ""}/></label>
          <label>Plural<input name="plural" defaultValue={lexeme.plural ?? ""}/></label>
          <label>Gender<input name="gender" defaultValue={lexeme.gender ?? ""}/></label>
          <label>CEFR<input name="cefrLevel" defaultValue={lexeme.cefrLevel ?? ""}/></label>
          <label>Part of speech<select name="partOfSpeech" defaultValue={lexeme.partOfSpeech}>{["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","PHRASE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
          <ConfirmSubmitButton message="Save canonical lexeme changes?">Save canonical data</ConfirmSubmitButton>
        </form>

        <div className="admin-three-column">
          <section><h3>Aliases</h3><div className="admin-chip-list">{lexeme.aliases.map((alias)=><form action={removeAliasAction} key={alias.id} className="admin-chip"><input type="hidden" name="aliasId" value={alias.id}/><span>{alias.surface} · {alias.kind}</span><ConfirmSubmitButton className="admin-chip-delete" message={"Remove alias “"+alias.surface+"”?"}>×</ConfirmSubmitButton></form>)}</div><form action={addAliasAction} className="admin-inline-form"><input type="hidden" name="lexemeId" value={lexeme.id}/><input name="surface" placeholder="New alias" required/><select name="kind" defaultValue="SPELLING_VARIANT">{["USER_INPUT","ARTICLE_VARIANT","SPELLING_VARIANT","INFLECTED_FORM","IMPORTED","GENERATED"].map(x=><option key={x}>{x}</option>)}</select><button className="button button-secondary">Add</button></form></section>
          <section><h3>Senses, definitions & translations</h3>{lexeme.senses.map((sense)=><div className="admin-data-block" key={sense.id}><strong>{sense.key} · {sense.reviewState}</strong><span>{sense.gloss ?? "No gloss"}</span><small>{[...sense.definitions.map(d=>"definition "+d.language+": "+d.text),...sense.translations.map(t=>t.language+": "+t.text)].join(" · ") || "No semantic data"}</small></div>)}</section>
          <section><h3>Provenance</h3>{lexeme.provenance.map((p)=><div className="admin-data-block" key={p.id}><strong>{p.source} · {p.reviewState}</strong><span>{p.provider ?? "—"} / {p.model ?? "—"}</span><small>{p.promptVersion ?? "no prompt version"} · {p.contentVersion ?? "no content version"}</small></div>)}</section>
        </div>

        <div className="admin-two-column">
          <section><h3>Patterns</h3>{lexeme.patterns.map(p=><div className="admin-data-block" key={p.id}>{p.pattern}</div>)}<h3>Examples</h3>{lexeme.examples.map(e=><div className="admin-data-block" key={e.id}><strong>{e.targetText}</strong><span>{e.english ?? e.persian ?? ""}</span></div>)}</section>
          <section><h3>Review state</h3><form action={reviewLexemeAction} className="admin-inline-form"><input type="hidden" name="lexemeId" value={lexeme.id}/><select name="reviewState" defaultValue={lexeme.provenance[0]?.reviewState ?? "ACCEPTED"}>{Object.values(LexemeReviewState).map(x=><option key={x}>{x}</option>)}</select><ConfirmSubmitButton message="Change curated review state for this lexeme?">Apply state</ConfirmSubmitButton></form><p className="muted">{lexeme._count.encounters} encounters · {lexeme._count.mistakes} linked mistake records</p></section>
        </div>
      </article>)}
    </div>
    <nav className="admin-pagination"><span>{page>1?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page-1}}}>Previous</Link>:null}</span><span>Page {page} of {pages} · {total} lexemes</span><span>{page<pages?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page+1}}}>Next</Link>:null}</span></nav>
  </main>;
}
