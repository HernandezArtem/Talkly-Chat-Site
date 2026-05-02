# Language Support

Chattr supports English and Dutch UI and response guidance out of the box, so the widget can feel native on single-language or bilingual sites without maintaining separate builds.

Chattr currently supports two UI and chat language modes:

- `en` for English
- `nl` for Dutch

## How It Works

By default, Chattr uses heuristic language detection based on the user's recent messages. That affects:

- widget UI copy
- fallback and handoff messaging
- follow-up suggestions
- server prompt language guidance for model responses

If you want predictable behavior on a single-language site, set `data-language="en"` or `data-language="nl"` on the widget script tag.

## Notes

- Automatic detection is best-effort, not perfect language identification.
- Mixed-language conversations follow the most recent user language signal.
- Languages other than English and Dutch are not first-class supported yet and generally fall back to English behavior.

## Widget Override

```html
<script
  src="https://your-server.com/widget.js"
  data-server="https://your-server.com"
  data-language="en"
  defer
></script>
```
