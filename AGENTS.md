<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules
- All data flows through `src/lib/api/admin.functions.ts` (server fns + queryOptions); swapping mock → real API touches only there.
- Data shapes live in `src/lib/api/types.ts`; components receive typed props and never fetch themselves.
- Admin chrome (sidebar/topbar) renders in `__root.tsx`; each section has its own route file; `/$section` is only a fallback. Section data lives in `sections.functions.ts` + `mock-sections.ts`.
- Screen UI lives in `src/pages/XPage.tsx` (default export); `src/routes/*.tsx` stay thin (head + loader + component import). Why: familiar traditional React layout.
- Menu structure lives in `src/app.config.ts`; the API supplies only badge counts. Why: one central page list like a classic App.js.
