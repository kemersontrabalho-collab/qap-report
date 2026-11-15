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
- Voice dictation uses the browser's Web Speech API first and falls back to recording WAV + the authenticated /api/transcribe route (gateway transcription); why: iOS installed apps and some Android browsers lack or block native recognition.
- Voice conversation in "Dúvidas com IA" uses GPT Live via a persistent WebSocket relay (`src/lib/live-relay.server.ts`, dispatched at `/api/live` in `src/server.ts` and by `live-vite-plugin.ts` in dev); the browser sends the user's access token in `app.start` and the relay checks `is_premium_user` before opening a paid session; why: browser WebSockets cannot send auth headers and Live must stay premium-only like other AI features.
- Create initial subscriptions inside the existing signup trigger, and approve Pix through one transactional database function; why: signup must not omit trial state and partial approvals must never activate access.
- Use is_premium_user as the shared database access gate, including restrictive bulletin and preset policies; why: protected pages alone cannot prevent direct calls after subscription expiry.
- Run database access-rule tests with PGlite through the isolated Vitest configuration; why: exercise actual PostgreSQL functions without mutating customer payments or starting the voice relay.
- Persist signup and reported-Pix admin alerts with unique source IDs via database triggers; expose them only through admin-session functions and poll while the admin panel is open, because manual Pix is not bank-confirmed and alerts must survive closed sessions.
- Keep device permission checks client-side and stop media tracks immediately after permission requests; browser grants cannot be revoked by the app and checking access must not record users.
