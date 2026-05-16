/**
 * Lightweight logger with level filtering, module prefix, and caller-context output.
 *
 * Uses Proxy + Reflect so that `console.error/warn/info/debug` are invoked in the
 * **caller's** stack frame, not inside logger.ts.  The browser DevTools source link
 * will point to the actual call site (e.g. `fetcher.ts:411`) rather than
 * `logger.ts:140`.
 *
 * 轻量级日志工具，支持分级过滤、模块前缀、调用者上下文输出。
 *
 * 通过 Proxy + Reflect 使得 `console.error/warn/info/debug` 在**调用者**的
 * 栈帧中执行。浏览器 DevTools 的源文件链接会指向真正的调用位置
 * （如 `fetcher.ts:411`），而不是 `logger.ts:140`。
 *
 * @example
 * ```ts
 * import { Logger } from "@skax/logger";
 *
 * const logger = new Logger("MyModule", Logger.LEVEL.DEBUG);
 * logger.info("服务启动", { port: 3000 });
 * // [MyModule] [INFO] 服务启动 { port: 3000 }
 * // ↑ DevTools source: the actual file that called logger.info
 * ```
 */

/**
 * 日志记录器。
 *
 * 构造时返回 Proxy 实例。访问 `logger.info` 时，Proxy 的 `get` 陷阱会检查
 * 当前日志等级，然后返回一个已绑定前缀的 `console.info` 函数（或 noop）。
 * 调用者调用该函数时，`console.info` 在**调用者**的栈帧中执行。
 *
 * @example
 * ```ts
 * const logger = new Logger("HlsIO");
 * logger.info("playlist loaded");
 * ```
 */
class Logger {
  /**
   *  Empty function used as noop when the log level suppresses output.
   */
  static NOOP = (): void => {};
  /**
   * 日志等级常量。
   *
   * 定义在模块作用域（使用 `as const`），以便类内部可以引用而不被 TS 抱怨 "Logger 只引用了类型"。
   * 也暴露为 `Logger.LEVEL`，供公共 API 使用。
   */
  static LEVEL = {
    /** 关闭所有日志 */
    NONE: 0,
    /** 仅输出 error */
    ERROR: 1,
    /** 输出 warn 及更高级别 */
    WARN: 2,
    /** 输出 info 及更高级别 */
    INFO: 3,
    /** 输出所有日志（含 debug） */
    DEBUG: 4,
  } as const;

  private _level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL];
  private _prefix: string;

  constructor(prefix = "Logger", level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] = Logger.LEVEL.WARN) {
    this._prefix = prefix;
    this._level = level;

    if (typeof Proxy === "function" && typeof Reflect === "object") {
      // Return a Proxy so that every property access goes through the `get` trap.
      // This allows us to return `console.xxx.bind(console, ...)` functions on
      // the fly — when the caller invokes the returned function, the console call
      // happens in the **caller's** stack frame, not here.
      //
      // 返回 Proxy，使每次属性访问都经过 `get` 陷阱。
      // 这样可以在运行时返回 `console.xxx.bind(console, ...)` 函数——
      // 调用者调用返回的函数时，console 调用在**调用者**的栈帧中执行。
      return new Proxy(this, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);

          // Methods that are NOT log methods — return them directly.
          // 非日志方法 —— 直接返回。
          if (prop === "setLevel" || prop === "getLevel") {
            return typeof value === "function" ? value.bind(target) : value;
          }

          // Internal properties (prefixed with _) — return directly.
          // 内部属性（以 _ 开头）—— 直接返回。
          if (typeof prop === "string" && prop.startsWith("_")) {
            return value;
          }

          switch (prop) {
            case "error":
              return target._level >= Logger.LEVEL.ERROR ? console.error.bind(console, `[${target._prefix}] [ERROR]`) : Logger.NOOP;

            case "warn":
              return target._level >= Logger.LEVEL.WARN ? console.warn.bind(console, `[${target._prefix}] [WARN]`) : Logger.NOOP;

            case "info":
              return target._level >= Logger.LEVEL.INFO ? console.info.bind(console, `[${target._prefix}] [INFO]`) : Logger.NOOP;

            case "debug":
              return target._level >= Logger.LEVEL.DEBUG ? console.debug.bind(console, `[${target._prefix}] [DEBUG]`) : Logger.NOOP;

            case "group":
              return target._level >= Logger.LEVEL.DEBUG ? console.group.bind(console, `[${target._prefix}]`) : Logger.NOOP;

            case "groupEnd":
              return target._level >= Logger.LEVEL.DEBUG ? console.groupEnd.bind(console) : Logger.NOOP;

            default:
              return value;
          }
        },
      }) as unknown as Logger;
    }
  }

  setLevel(level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL]): void {
    this._level = level;
  }

  getLevel(): (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] {
    return this._level;
  }

  // TypeScript declarations so callers get proper autocomplete.
  // The actual implementations are provided by the Proxy above.
  //
  // TypeScript 声明，使调用者获得正确的自动补全。
  // 实际实现由上面的 Proxy 提供。

  /** @see constructor Proxy */
  error(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.ERROR) console.error(`[${this._prefix}] [ERROR]`, ..._args);
  }

  /** @see constructor Proxy */
  warn(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.WARN) console.warn(`[${this._prefix}] [WARN]`, ..._args);
  }

  /** @see constructor Proxy */
  info(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.INFO) console.info(`[${this._prefix}] [INFO]`, ..._args);
  }

  /** @see constructor Proxy */
  debug(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.debug(`[${this._prefix}] [DEBUG]`, ..._args);
  }

  /** @see constructor Proxy */
  group(_label: string): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.group(`[${this._prefix}] [GROUP] ${_label}`);
  }

  /** @see constructor Proxy */
  groupEnd(): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.groupEnd();
  }
}

/** 全局共享的 Logger 单例（惰性初始化）。 */
let __$Default_Logger$__: Logger | null = null;

function getLogger(debug = false): Logger {
  if (!__$Default_Logger$__) {
    __$Default_Logger$__ = new Logger("Logger", debug ? Logger.LEVEL.DEBUG : Logger.LEVEL.WARN);
  }
  return __$Default_Logger$__;
}

export { Logger, getLogger };
