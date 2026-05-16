# @skax/logger

轻量级、零依赖的日志工具，支持**分级过滤**、**模块前缀**和**调用者上下文输出**。

通过 `Proxy` + `Reflect` 使得浏览器 DevTools 的源文件链接指向真正的调用位置，而非 logger 内部。

## 特性

- 🎚️ **分级过滤** — `NONE` / `ERROR` / `WARN` / `INFO` / `DEBUG`，运行时动态切换
- 🏷️ **模块前缀** — 每个 logger 携带 `[模块名]` 标签，便于识别来源
- 📍 **调用者上下文** — DevTools 源链接指向实际调用位置，而非 `logger.ts:140`
- 🪞 **Proxy 分发** — 零开销：级别不满足时返回 `NOOP` 空函数
- 📦 **Tree-shakable** — ESM & CJS 双构建，零依赖
- 🌐 **UMD 构建** — 浏览器 `<script>` 直接引入

## 安装

```bash
npm install @skax/logger
```

## 快速开始

```ts
import { Logger } from "@skax/logger";

const logger = new Logger("MyModule", Logger.LEVEL.DEBUG);

logger.info("服务启动", { port: 3000 });
// → [MyModule] [INFO] 服务启动 { port: 3000 }

logger.warn("磁盘空间不足", { remaining: "2%" });
// → [MyModule] [WARN] 磁盘空间不足 { remaining: "2%" }

logger.error("连接失败", new Error("超时"));
// → [MyModule] [ERROR] 连接失败 Error: 超时
```

## API

### `new Logger(prefix?, level?)`

创建一个 logger 实例。

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `prefix` | `string` | `"Logger"` | 模块名称，显示在 `[方括号]` 中 |
| `level` | `Level` | `Logger.LEVEL.WARN` | 最低输出级别 |

```ts
const logger = new Logger("API", Logger.LEVEL.INFO);
```

### 日志等级

通过 `Logger.LEVEL` 访问：

| 常量 | 值 | 说明 |
|----------|-------|-------------|
| `Logger.LEVEL.NONE` | `0` | 关闭所有日志 |
| `Logger.LEVEL.ERROR` | `1` | 仅输出 error |
| `Logger.LEVEL.WARN` | `2` | 输出 warn 及 error |
| `Logger.LEVEL.INFO` | `3` | 输出 info、warn、error |
| `Logger.LEVEL.DEBUG` | `4` | 输出所有日志（含 debug） |

### 日志方法

```ts
logger.error(...args);   // 始终输出（除非 level = NONE）
logger.warn(...args);    // level ≥ WARN 时输出
logger.info(...args);    // level ≥ INFO 时输出
logger.debug(...args);   // level ≥ DEBUG 时输出
logger.group(label);     // level ≥ DEBUG 时调用 console.group
logger.groupEnd();       // level ≥ DEBUG 时调用 console.groupEnd
```

### `setLevel(level)` / `getLevel()`

运行时修改或读取日志级别：

```ts
logger.setLevel(Logger.LEVEL.DEBUG);  // 开启所有日志
logger.setLevel(Logger.LEVEL.NONE);   // 关闭所有日志

console.log(logger.getLevel());       // 0
```

### `getLogger(debug?)`

返回全局单例 logger，前缀固定为 `"Logger"`：

```ts
import { getLogger } from "@skax/logger";

const log = getLogger(true);   // DEBUG 级别
log.info("应用已初始化");        // → [Logger] [INFO] 应用已初始化
```

单例在首次调用时惰性创建——后续调用返回同一实例。

### TypeScript

```ts
import { Logger } from "@skax/logger";

// 级别类型从 Logger.LEVEL 推导：
const level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] = Logger.LEVEL.DEBUG;

// 或直接让 TS 推断：
const logger = new Logger("TSModule", Logger.LEVEL.INFO);
logger.setLevel(Logger.LEVEL.DEBUG);
const current = logger.getLevel(); // 0 | 1 | 2 | 3 | 4
```

## 原理

构造函数返回一个 **Proxy** 实例来拦截属性访问。调用 `logger.info(...)` 时：

1. Proxy 的 `get` 陷阱检查 `target._level >= Logger.LEVEL.INFO`
2. 满足条件 → 返回 `console.info.bind(console, "[前缀] [INFO]")` — 在**调用者**栈帧中执行
3. 不满足 → 返回 `Logger.NOOP` — 空函数，零开销

```
yourFile.ts:42  →  logger.info("你好")
                     ↓
              Proxy.get("info")
                     ↓
              console.info.bind(console, "[Demo] [INFO]")
                     ↓
              DevTools 源链接 → yourFile.ts:42 ✓
```

## 浏览器使用 (UMD)

```html
<script src="./node_modules/@skax/logger/dist/index.umd.js"></script>
<script>
  const logger = new Logger("Browser", Logger.LEVEL.DEBUG);
  logger.info("来自浏览器的问候！");
</script>
```

在线演示：[`public/index.html`](public/index.html)

## 构建

```bash
npm run build      # 生产构建（CJS + ESM + UMD）
npm run dev        # 开发模式（watch）
npm run test       # 运行测试（含覆盖率）
```

输出结构：

```
dist/
├── index.cjs       # CommonJS
├── index.esm.js    # ES Module
├── index.umd.js    # UMD（浏览器）
└── types/
    └── index.d.ts  # TypeScript 类型声明
```

## 许可证

MIT
