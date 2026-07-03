# Talkly

**Самостоятельный AI-чат для сайта** — один тег `<script>`, ваш сервер, ваши данные, русский и английский из коробки.

**Автор:** [HernandezArtem](https://github.com/HernandezArtem)

---

## Что это

Talkly — виджет чата, который встраивается на любой сайт и отвечает на вопросы посетителей на основе вашего контента (RAG), с защитой от prompt-injection и настраиваемым дизайном.

| Компонент | Описание |
|-----------|----------|
| **Виджет** | Кнопка и окно чата (Shadow DOM, не ломает стили сайта) |
| **Сервер** | API, AI, база знаний, guardrails |
| **Языки** | Русский и английский (автоопределение + переключатель) |

Стек: TypeScript, Hono, Vercel AI SDK, SQLite + sqlite-vec, Turborepo.

---

## Быстрый старт

**Нужно:** Node.js 20+, pnpm 9+

```bash
git clone https://github.com/HernandezArtem/Talkly.git
cd Talkly
pnpm install
pnpm onboard
```

Мастер `onboard` спросит провайдера AI (OpenAI, Anthropic, Azure, Ollama), ключ, брендинг и URL сайта для скрапинга.

```bash
pnpm build
pnpm start
```

Откройте [http://localhost:3000/demo.html](http://localhost:3000/demo.html) — демо-страница с переключателем RU/EN.

Загрузить демо-контент в базу знаний:

```bash
pnpm seed-demo
```

---

## Встраивание на сайт

Вставьте перед `</body>`:

```html
<script
  src="https://chat.ваш-домен.ru/widget.js"
  data-server="https://chat.ваш-домен.ru"
  data-language="ru"
  data-theme-primary="#7c3aed"
  data-theme-title="Talkly"
  data-theme-avatar="https://ваш-сайт.ru/avatar.svg"
  defer
></script>
```

| Атрибут | Назначение |
|---------|------------|
| `data-server` | **Обязательно.** URL вашего Talkly-сервера |
| `src` | Тот же сервер + `/widget.js` |
| `data-language` | `ru` или `en` — язык по умолчанию |
| `data-theme-primary` | Цвет акцента |
| `data-theme-title` | Заголовок в шапке чата |
| `data-theme-avatar` | URL аватарки |
| `data-show-language-switcher` | `false` — скрыть RU/EN в виджете |

Переключить язык из JavaScript:

```javascript
Talkly.setLanguage("ru"); // или "en"
```

Минимальный вариант:

```html
<script
  src="https://chat.ваш-домен.ru/widget.js"
  data-server="https://chat.ваш-домен.ru"
  defer
></script>
```

> `localhost` работает только на вашем компьютере. Для реального сайта нужен сервер в интернете с HTTPS.

---

## Провайдеры AI

| Провайдер | Чат | Эмбеддинги |
|-----------|:---:|:----------:|
| `openai` | ✓ | ✓ |
| `anthropic` | ✓ | через OpenAI |
| `azure-openai` | ✓ | ✓ |
| `ollama` | ✓ | ✓ (локально, без ключей) |

Локально с Ollama:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
pnpm onboard   # выберите ollama
```

---

## Docker

```bash
docker build -t talkly .

docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -v talkly-data:/app/data \
  talkly
```

При первом запуске контейнер сам загрузит демо-контент в базу (если есть API-ключ). Данные сохраняются в volume `talkly-data`.

---

## Полезные команды

```bash
pnpm dev              # разработка
pnpm test             # тесты
pnpm typecheck        # проверка типов
pnpm seed-demo        # демо FAQ в базу знаний
pnpm --filter @chattr/server scrape-ingest --tenant default   # скрапинг сайта
```

---

## Структура проекта

```
apps/server/          # API, RAG, guardrails, статика (widget.js, demo.html)
packages/widget/      # виджет чата (IIFE bundle)
packages/shared/      # типы, язык, общие утилиты
```

Конфиг тенанта: `apps/server/src/instance/default/chattr.config.ts`

---

## Лицензия

[MIT](LICENSE)
