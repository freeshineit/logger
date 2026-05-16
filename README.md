# @skax/logger

A lightweight, zero-dependency logger with **level filtering**, **module prefix**, and **caller-context output**.

Uses `Proxy` + `Reflect` so DevTools source links point to the actual call site — not logger internals.

## Features

- 🎚️ **Level filtering** — `NONE` / `ERROR` / `WARN` / `INFO` / `DEBUG`, switchable at runtime
- 🏷️ **Module prefix** — each logger carries a `[ModuleName]` tag for easy identification
- 📍 **Caller-context output** — browser DevTools link to the real call site, not `logger.ts:140`
- 🪞 **Proxy-based dispatch** — zero-overhead: returns `NOOP` when the level suppresses output
- 📦 **Tree-shakable** — ESM & CJS builds, no dependencies
- 🌐 **UMD build** — drop-in `<script>` for browser usage

## Installation

```bash
npm install @skax/logger

# or yarn
yarn add @skax/logger

# or pnpm
pnpm add @skax/logger
```

## Quick Start

```ts
import { Logger } from "@skax/logger";

const logger = new Logger("MyModule", Logger.LEVEL.DEBUG);

logger.info("Server started", { port: 3000 });
// → [MyModule] [INFO] Server started { port: 3000 }

logger.warn("Disk space low", { remaining: "2%" });
// → [MyModule] [WARN] Disk space low { remaining: "2%" }

logger.error("Connection failed", new Error("timeout"));
// → [MyModule] [ERROR] Connection failed Error: timeout
```

## API

### new Logger(prefix?, level?)

Creates a new logger instance.

| Parameter | Type     | Default             | Description                       |
| --------- | -------- | ------------------- | --------------------------------- |
| `prefix`  | `string` | `"Logger"`          | Module name shown in `[brackets]` |
| `level`   | `Level`  | `Logger.LEVEL.WARN` | Minimum log level to output       |

<br/>

```ts
const logger = new Logger("API", Logger.LEVEL.INFO);
```

### Log Levels

Accessible via `Logger.LEVEL`:

| Constant             | Value | Description                    |
| -------------------- | ----- | ------------------------------ |
| `Logger.LEVEL.NONE`  | `0`   | Suppress all output            |
| `Logger.LEVEL.ERROR` | `1`   | Only errors                    |
| `Logger.LEVEL.WARN`  | `2`   | Warnings and errors            |
| `Logger.LEVEL.INFO`  | `3`   | Info, warnings, errors         |
| `Logger.LEVEL.DEBUG` | `4`   | All messages (including debug) |

### Methods

#### error(...args)

```ts
logger.error(...args); // 始终输出（除非 level = NONE）
```

#### warn(...args)

```ts
logger.warn(...args); // level ≥ WARN 时输出
```

#### info(...args)

```ts
logger.info(...args); // level ≥ INFO 时输出
```

#### debug(...args)

```ts
logger.debug(...args); // level ≥ DEBUG 时输出
```

#### group(...args)

```ts
logger.group(...args); // level ≥ DEBUG 时调用 console.group
```

#### groupEnd(...args)

```ts
logger.groupEnd(...args); // level ≥ DEBUG 时调用 console.groupEnd
```

#### setLevel(level)

Change or read the log level at runtime:

```ts
logger.setLevel(Logger.LEVEL.DEBUG); // enable all logs
logger.setLevel(Logger.LEVEL.NONE); // silence everything
```

#### getLevel()

Change or read the log level at runtime:

```ts
console.log(logger.getLevel()); // 0
```

#### getLogger(debug?)

Returns a global singleton logger with prefix `"Logger"`:

```ts
import { getLogger } from "@skax/logger";

const log = getLogger(true); // DEBUG level
log.info("App initialized"); // → [Logger] [INFO] App initialized
```

The singleton is lazily created on first call — subsequent calls return the same instance.

### TypeScript

```ts
import { Logger } from "@skax/logger";

// The level type is inferred from Logger.LEVEL:
const level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] = Logger.LEVEL.DEBUG;

// Or just let TS infer:
const logger = new Logger("TSModule", Logger.LEVEL.INFO);
logger.setLevel(Logger.LEVEL.DEBUG);
const current = logger.getLevel(); // 0 | 1 | 2 | 3 | 4
```

## How It Works

The constructor returns a **Proxy** that intercepts property access. When you call `logger.info(...)`:

1. The Proxy's `get` trap checks `target._level >= Logger.LEVEL.INFO`
2. If `true` → returns `console.info.bind(console, "[prefix] [INFO]")` — called in **your** stack frame
3. If `false` → returns `Logger.NOOP` — a no-op function, zero cost

```
yourFile.ts:42  →  logger.info("hello")
                     ↓
              Proxy.get("info")
                     ↓
              console.info.bind(console, "[Demo] [INFO]")
                     ↓
              DevTools source → yourFile.ts:42 ✓
```

## Browser Usage (UMD)

```html
<script src="./node_modules/@skax/logger/dist/index.umd.js"></script>
<script>
  const logger = new Logger("Browser", Logger.LEVEL.DEBUG);
  logger.info("Hello from the browser!");
</script>
```

A live demo is included at [`public/index.html`](public/index.html).

## Build

```bash
npm run build      # Production build (CJS + ESM + UMD)
npm run dev        # Development watch mode
npm run test       # Run tests with coverage
```

Output:

```
dist/
├── index.cjs       # CommonJS
├── index.esm.js    # ES Module
├── index.umd.js    # UMD (browser)
└── types/
    └── index.d.ts  # TypeScript declarations
```

## License

MIT
