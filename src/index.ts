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
 * @module
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
 * 构造时返回 Proxy 实例，对 `logger.xxx()` 的每次调用都在**调用者**的栈帧中执行
 * `console.xxx`，因此浏览器 DevTools 的源文件链接指向业务代码而非本文件。
 *
 * 当 Proxy 不可用时（如极端旧环境），降级为普通方法调用。
 *
 * @class
 * @example
 * ```ts
 * const logger = new Logger("Logger");
 * logger.info("playlist loaded");
 * ```
 */
class Logger {
  /**
   * 空函数，当日志级别不满足条件时替代真正的 console 方法，避免无效调用。
   *
   * 每个被抑制的日志方法调用都会返回此函数，调用者执行它时不会有任何副作用。
   *
   * Empty function used as noop when the log level suppresses output.
   * Every suppressed log method returns this function — calling it is a true no-op.
   *
   * @public
   */
  static NOOP = (): void => {};

  /**
   * 日志等级常量（数字枚举对象）。
   *
   * 使用 `as const` 断言保留字面量类型，便于 TS 推导出联合类型
   * `0 | 1 | 2 | 3 | 4`，同时作为静态属性暴露供外部使用。
   *
   * | 常量 | 值 | 说明 |
   * |------|----|------|
   * | `Logger.LEVEL.NONE`  | `0` | 关闭所有日志 |
   * | `Logger.LEVEL.ERROR` | `1` | 仅输出 error |
   * | `Logger.LEVEL.WARN`  | `2` | 输出 warn 及更高级别 |
   * | `Logger.LEVEL.INFO`  | `3` | 输出 info 及更高级别 |
   * | `Logger.LEVEL.DEBUG` | `4` | 输出所有日志（含 debug） |
   *
   * Log level constants declared with `as const` so TypeScript
   * infers literal types, enabling the union `0 | 1 | 2 | 3 | 4`.
   *
   * | Constant | Value | Description |
   * |----------|-------|-------------|
   * | `Logger.LEVEL.NONE`   | `0`   | Suppress all output |
   * | `Logger.LEVEL.ERROR`  | `1`   | Only errors |
   * | `Logger.LEVEL.WARN`   | `2`   | Warnings and above |
   * | `Logger.LEVEL.INFO`   | `3`   | Info and above |
   * | `Logger.LEVEL.DEBUG`  | `4`   | All messages (including debug) |
   *
   * @public
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

  /**
   * 当前日志级别。只有 ≥ 此级别的日志方法才会真正输出。
   *
   * @private
   */
  private _level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL];

  /**
   * 模块前缀，显示在每条日志的 `[前缀]` 中，用于区分不同模块的输出。
   *
   * @private
   */
  private _prefix: string;

  /**
   * 创建一个 Logger 实例。
   *
   * 在支持 Proxy 的环境中，构造函数返回 Proxy 实例而非 `this`。
   * Proxy 拦截所有属性访问，按需返回绑定了前缀的 `console.*` 函数或空函数。
   *
   * @param {string}  [prefix="Logger"] - 模块前缀，显示在 `[方括号]` 中
   * @param {number}  [level=Logger.LEVEL.WARN] - 最低输出级别，低于此级别的日志会被抑制
   *
   * @example
   * ```ts
   * // 默认 WARN 级别，只输出 error 和 warn
   * const logger = new Logger("Logger");
   *
   * // DEBUG 级别，输出所有日志
   * const debugLogger = new Logger("Debug", Logger.LEVEL.DEBUG);
   * ```
   */
  constructor(prefix = "Logger", level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] = Logger.LEVEL.WARN) {
    this._prefix = prefix;
    this._level = level;

    // 只有 Proxy + Reflect 都可用时才使用代理模式
    if (typeof Proxy === "function" && typeof Reflect === "object") {
      // 返回 Proxy 而非 this：
      // - 每次属性访问都经过 get 陷阱
      // - 日志方法返回 `console.xxx.bind(console, prefix)` → 在**调用者**栈帧执行
      // - 不满足级别的方法返回 Logger.NOOP → 零开销空调用
      //
      // Return Proxy instead of this:
      // - Every property access goes through the `get` trap
      // - Log methods return `console.xxx.bind(console, prefix)` → executed in caller's frame
      // - Suppressed methods return Logger.NOOP → true no-op
      return new Proxy(this, {
        /**
         * Proxy get trap —— 拦截所有属性访问。
         *
         * @param {Logger} target   - 原始 Logger 实例
         * @param {string} prop     - 被访问的属性名
         * @param {Proxy}  receiver - Proxy 自身
         * @returns {unknown} 绑定了前缀的 console 函数、NOOP 或原始属性值
         */
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);

          // setLevel / getLevel 是控制方法，不是日志方法，直接返回绑定版本
          // setLevel / getLevel are control methods, not log methods — return bound version
          if (prop === "setLevel" || prop === "getLevel") {
            return typeof value === "function" ? value.bind(target) : value;
          }

          // 内部属性（_ 前缀）直接透传，不经过日志逻辑
          // Internal properties (_ prefix) pass through directly
          if (typeof prop === "string" && prop.startsWith("_")) {
            return value;
          }

          // 日志方法分发：检查当前级别，返回绑定了前缀的 console 函数或 NOOP
          // Log method dispatch: check level, return bound console or NOOP
          switch (prop) {
            case "error":
              // ERROR 级别最低门槛 ≥1，除了 NONE 之外始终输出
              return target._level >= Logger.LEVEL.ERROR ? console.error.bind(console, `[${target._prefix}] [ERROR]`) : Logger.NOOP;

            case "warn":
              return target._level >= Logger.LEVEL.WARN ? console.warn.bind(console, `[${target._prefix}] [WARN]`) : Logger.NOOP;

            case "info":
              return target._level >= Logger.LEVEL.INFO ? console.info.bind(console, `[${target._prefix}] [INFO]`) : Logger.NOOP;

            case "debug":
              return target._level >= Logger.LEVEL.DEBUG ? console.debug.bind(console, `[${target._prefix}] [DEBUG]`) : Logger.NOOP;

            case "group":
              // console.group 同样走 DEBUG 级别
              return target._level >= Logger.LEVEL.DEBUG ? console.group.bind(console, `[${target._prefix}]`) : Logger.NOOP;

            case "groupEnd":
              return target._level >= Logger.LEVEL.DEBUG ? console.groupEnd.bind(console) : Logger.NOOP;

            default:
              // 非日志属性（如 Symbol、toString 等）原样返回
              return value;
          }
        },
      }) as unknown as Logger;
    }
    // 不支持 Proxy 的环境（极少数），降级为普通实例
    // Fallback for environments without Proxy
  }

  /**
   * 动态设置日志级别。
   *
   * 调用后立即生效——已抑制的日志方法会变为 NOOP，已启用的会恢复输出。
   *
   * @param {number} level - 新的日志级别，使用 `Logger.LEVEL.XXX` 常量
   *
   * @example
   * ```ts
   * logger.setLevel(Logger.LEVEL.DEBUG); // 开启全部日志
   * logger.setLevel(Logger.LEVEL.NONE);  // 关闭全部日志
   * ```
   */
  setLevel(level: (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL]): void {
    this._level = level;
  }

  /**
   * 获取当前日志级别。
   *
   * @returns {number} 当前日志级别（0 | 1 | 2 | 3 | 4）
   *
   * @example
   * ```ts
   * if (logger.getLevel() === Logger.LEVEL.DEBUG) {
   *   logger.info("调试模式已开启");
   * }
   * ```
   */
  getLevel(): (typeof Logger.LEVEL)[keyof typeof Logger.LEVEL] {
    return this._level;
  }

  // =========================================================================
  // TypeScript 方法声明（供 IDE 自动补全）
  // 实际实现在上面的 Proxy get 陷阱中。
  // 以下方法是 Proxy 不可用时的降级实现 + TS 类型签名。
  //
  // TypeScript declarations for IDE autocomplete.
  // Actual implementation is in the Proxy get trap above.
  // These methods serve as fallback (no Proxy) + provide type signatures.
  // =========================================================================

  /**
   * 输出错误日志。
   *
   * 当 `level ≥ ERROR` 时输出到 `console.error`，带 `[prefix] [ERROR]` 前缀。
   *
   * @param {...unknown} _args - 任意参数，原样传递给 console.error
   *
   * @example
   * ```ts
   * logger.error("请求失败", { status: 500 });
   * // → [Logger] [ERROR] 请求失败 { status: 500 }
   * ```
   */
  error(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.ERROR) console.error(`[${this._prefix}] [ERROR]`, ..._args);
  }

  /**
   * 输出警告日志。
   *
   * 当 `level ≥ WARN` 时输出到 `console.warn`，带 `[prefix] [WARN]` 前缀。
   *
   * @param {...unknown} _args - 任意参数
   *
   * @example
   * ```ts
   * logger.warn("配置项缺失，使用默认值", { key: "timeout" });
   * // → [Logger] [WARN] 配置项缺失，使用默认值 { key: "timeout" }
   * ```
   */
  warn(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.WARN) console.warn(`[${this._prefix}] [WARN]`, ..._args);
  }

  /**
   * 输出信息日志。
   *
   * 当 `level ≥ INFO` 时输出到 `console.info`，带 `[prefix] [INFO]` 前缀。
   *
   * @param {...unknown} _args - 任意参数
   *
   * @example
   * ```ts
   * logger.info("服务启动", { port: 3000 });
   * // → [Logger] [INFO] 服务启动 { port: 3000 }
   * ```
   */
  info(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.INFO) console.info(`[${this._prefix}] [INFO]`, ..._args);
  }

  /**
   * 输出调试日志。
   *
   * 当 `level ≥ DEBUG` 时输出到 `console.debug`，带 `[prefix] [DEBUG]` 前缀。
   *
   * @param {...unknown} _args - 任意参数
   *
   * @example
   * ```ts
   * logger.debug("请求详情", { method: "POST", payload: { id: 1 } });
   * // → [Logger] [DEBUG] 请求详情 { method: "POST", payload: { id: 1 } }
   * ```
   */
  debug(..._args: unknown[]): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.debug(`[${this._prefix}] [DEBUG]`, ..._args);
  }

  /**
   * 开始一个可折叠的日志分组（浏览器 console.group）。
   *
   * 当 `level ≥ DEBUG` 时调用 `console.group`，此后直到 `groupEnd()` 的日志
   * 会嵌套在该分组内。
   *
   * @param {string} _label - 分组标题
   *
   * @example
   * ```ts
   * logger.group("批量处理");
   * logger.debug("步骤 1");
   * logger.debug("步骤 2");
   * logger.groupEnd();
   * ```
   */
  group(_label: string): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.group(`[${this._prefix}] [GROUP] ${_label}`);
  }

  /**
   * 结束当前日志分组（浏览器 console.groupEnd）。
   *
   * 当 `level ≥ DEBUG` 时调用 `console.groupEnd`。
   *
   * @example
   * ```ts
   * logger.groupEnd();
   * ```
   */
  groupEnd(): void {
    if (this._level >= Logger.LEVEL.DEBUG) console.groupEnd();
  }
}

/**
 * 全局 Logger 单例（惰性初始化）。
 *
 * 首次调用 `getLogger()` 时创建，之后始终返回同一实例。
 * 适用于全局只需要一个 logger 的场景。
 *
 * @private
 */
let __$Default_Logger$__: Logger | null = null;

/**
 * 获取全局共享的 Logger 单例。
 *
 * 惰性初始化：首次调用时创建实例，后续调用返回同一对象。
 * 前缀固定为 `"Logger"`。
 *
 * @param {boolean} [debug=false] - 是否开启 DEBUG 模式。`true` 时级别为 DEBUG，否则为 WARN
 * @returns {Logger} 全局唯一的 Logger 实例
 *
 * @example
 * ```ts
 * import { getLogger } from "@skax/logger";
 *
 * // 生产环境：默认 WARN 级别
 * const log = getLogger();
 *
 * // 开发环境：DEBUG 级别
 * const debugLog = getLogger(true);
 *
 * // 两次调用返回同一实例
 * console.log(getLogger() === getLogger()); // true
 * ```
 */
function getLogger(debug = false): Logger {
  if (!__$Default_Logger$__) {
    __$Default_Logger$__ = new Logger("Logger", debug ? Logger.LEVEL.DEBUG : Logger.LEVEL.WARN);
  }
  return __$Default_Logger$__;
}

export { Logger, getLogger };
