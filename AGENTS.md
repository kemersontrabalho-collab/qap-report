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
