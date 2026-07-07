# Aetheris — Unified Intelligence Layer

Ask every AI at once. Aetheris is a single dashboard for sending one prompt to ChatGPT, Claude, Gemini, Perplexity, Grok, DeepSeek, Groq, Mistral, and image models — side by side in a Response Matrix — with a local analytics panel tracking your own usage.

**[Live demo →](#)** *(replace this with your GitHub Pages link once deployed — see below)*

---

## What's actually working

- **Four suites** — General Assistant, Deep Research, Advanced Coding, Image Generation — each with its own curated model pill row.
- **Live API calls, if you bring your own key.** Add a key in ⚙ Settings for OpenAI, Anthropic, Google, Perplexity, DeepSeek, Groq, xAI (Grok), Mistral, Stability AI, or Ideogram, and Aetheris calls that provider directly and renders the answer — markdown, code blocks and all — right in that model's card.
- **Fallback for everyone else.** No key for a tool, or a tool with no public API (Midjourney, v0, Google Scholar, Consensus, Copilot)? Aetheris opens a tab with your prompt pre-filled, or copies it to your clipboard.
- **Continue a conversation** with any live model directly from its card.
- **Copy any response**, or open the model in a new tab, from each card's ⋮ menu.
- **Custom / local models** — add any OpenAI-compatible endpoint (Ollama running locally, OpenRouter, a self-hosted model).
- **Real local analytics** — Today's Activity, a usage donut, and Recent History are all computed from what you've actually sent, stored in `localStorage`.
- **Dark and light themes**, each with an animated starfield/nebula background.
- **Responsive** — sidebar and analytics panel collapse into slide-out drawers on smaller screens.

## Honest limitations

- **Some providers block direct browser calls (CORS).** OpenAI in particular usually rejects requests made straight from a website — a backend relay is the standard fix, which this project intentionally doesn't have (no backend at all, to stay free to host and safe to publish). If a call fails, the card says so plainly.
- **API keys live only in your own browser's `localStorage`.** Never sent anywhere except the provider you're calling, never bundled into the repo. If you're on a shared computer, use "Clear all keys" in settings before you leave.
- **Web Search and Reasoning mode are lightweight, not separate backends.** "Reasoning mode" prepends a step-by-step instruction to your prompt. "Web Search" reorders the pipeline to call Perplexity first — there's no separate search index behind it.

## Tech stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no bundler, no dependencies to install.

```
aetheris/
├── index.html   # dashboard shell
├── style.css    # dual theme, layout, animation
└── script.js    # model registry, API adapters, analytics, rendering
```

## Running it locally

```bash
python -m http.server 8000
# or
npx serve .
```
Then visit `http://localhost:8000`. (Opening `index.html` directly usually also works, but some browsers restrict the Clipboard API on `file://` URLs.)

## License

MIT — see [LICENSE](LICENSE).