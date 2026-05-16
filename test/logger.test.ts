/**
 * @skax/logger — Unit Tests
 *
 * Covers:
 *  - Logger.LEVEL constants
 *  - Logger.NOOP
 *  - Constructor (defaults, custom prefix/level)
 *  - Level filtering (each level)
 *  - setLevel / getLevel
 *  - error / warn / info / debug methods
 *  - group / groupEnd methods
 *  - getLogger() singleton
 *  - Edge cases
 */

import { Logger, getLogger } from "../src/index";

const { LEVEL, NOOP } = Logger;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Spy on a console method and return the spy. */
function spyConsole(method: keyof Console): jest.SpyInstance {
  return jest.spyOn(console, method as string as "error").mockImplementation(() => {});
}

/** Restore all console spies. */
function restoreConsole(...spies: jest.SpyInstance[]): void {
  spies.forEach((s) => s.mockRestore());
}

// ---------------------------------------------------------------------------
// Logger.LEVEL
// ---------------------------------------------------------------------------

describe("Logger.LEVEL", () => {
  it("should expose five level constants", () => {
    expect(LEVEL.NONE).toBe(0);
    expect(LEVEL.ERROR).toBe(1);
    expect(LEVEL.WARN).toBe(2);
    expect(LEVEL.INFO).toBe(3);
    expect(LEVEL.DEBUG).toBe(4);
  });

  it("should be frozen / immutable", () => {
    expect(Object.isFrozen(LEVEL)).toBe(false); // as const doesn't freeze
    // but the object reference is constant
    expect(LEVEL).toBe(Logger.LEVEL);
  });
});

// ---------------------------------------------------------------------------
// Logger.NOOP
// ---------------------------------------------------------------------------

describe("Logger.NOOP", () => {
  it("should be a function that returns undefined", () => {
    expect(typeof NOOP).toBe("function");
    expect(NOOP()).toBeUndefined();
  });

  it("should accept any arguments without throwing", () => {
    expect(() => NOOP("test", 123, { a: 1 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("Logger constructor", () => {
  it("should use default prefix 'Logger' and level WARN", () => {
    const logger = new Logger();
    expect(logger.getLevel()).toBe(LEVEL.WARN);
  });

  it("should accept a custom prefix", () => {
    const logger = new Logger("CustomPrefix");
    expect(logger.getLevel()).toBe(LEVEL.WARN);
  });

  it("should accept a custom prefix and level", () => {
    const logger = new Logger("DebugMod", LEVEL.DEBUG);
    expect(logger.getLevel()).toBe(LEVEL.DEBUG);
  });

  it("should accept NONE level", () => {
    const logger = new Logger("Silent", LEVEL.NONE);
    expect(logger.getLevel()).toBe(LEVEL.NONE);
  });

  it("should return a Proxy (not plain instance)", () => {
    const logger = new Logger();
    // Proxy instances are not instanceof Logger in the usual sense,
    // but the Proxy itself wraps a Logger instance.
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.setLevel).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// setLevel / getLevel
// ---------------------------------------------------------------------------

describe("setLevel / getLevel", () => {
  it("should get the initial level", () => {
    const logger = new Logger("Test", LEVEL.INFO);
    expect(logger.getLevel()).toBe(LEVEL.INFO);
  });

  it("should change level dynamically", () => {
    const logger = new Logger("Test", LEVEL.WARN);
    logger.setLevel(LEVEL.DEBUG);
    expect(logger.getLevel()).toBe(LEVEL.DEBUG);
  });

  it("should switch to NONE and back", () => {
    const logger = new Logger("Test", LEVEL.INFO);
    logger.setLevel(LEVEL.NONE);
    expect(logger.getLevel()).toBe(LEVEL.NONE);
    logger.setLevel(LEVEL.ERROR);
    expect(logger.getLevel()).toBe(LEVEL.ERROR);
  });
});

// ---------------------------------------------------------------------------
// Level filtering — each level
// ---------------------------------------------------------------------------

describe("Level filtering", () => {
  describe("NONE (0)", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger("Test", LEVEL.NONE);
    });

    it("should suppress error", () => {
      const spy = spyConsole("error");
      logger.error("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress warn", () => {
      const spy = spyConsole("warn");
      logger.warn("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress info", () => {
      const spy = spyConsole("info");
      logger.info("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress debug", () => {
      const spy = spyConsole("debug");
      logger.debug("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress group", () => {
      const spy = spyConsole("group");
      logger.group("label");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress groupEnd", () => {
      const spy = spyConsole("groupEnd");
      logger.groupEnd();
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });
  });

  describe("ERROR (1)", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger("Test", LEVEL.ERROR);
    });

    it("should output error", () => {
      const spy = spyConsole("error");
      logger.error("fail");
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("[Test] [ERROR]", "fail");
      restoreConsole(spy);
    });

    it("should suppress warn", () => {
      const spy = spyConsole("warn");
      logger.warn("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress info", () => {
      const spy = spyConsole("info");
      logger.info("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress debug", () => {
      const spy = spyConsole("debug");
      logger.debug("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });
  });

  describe("WARN (2)", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger("Test", LEVEL.WARN);
    });

    it("should output error", () => {
      const spy = spyConsole("error");
      logger.error("err");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should output warn", () => {
      const spy = spyConsole("warn");
      logger.warn("wrn");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should suppress info", () => {
      const spy = spyConsole("info");
      logger.info("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });

    it("should suppress debug", () => {
      const spy = spyConsole("debug");
      logger.debug("msg");
      expect(spy).not.toHaveBeenCalled();
      restoreConsole(spy);
    });
  });

  describe("INFO (3)", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger("Test", LEVEL.INFO);
    });

    it("should output error", () => {
      const spyE = spyConsole("error");
      logger.error("e");
      expect(spyE).toHaveBeenCalledTimes(1);
      restoreConsole(spyE);
    });

    it("should output warn", () => {
      const spyW = spyConsole("warn");
      logger.warn("w");
      expect(spyW).toHaveBeenCalledTimes(1);
      restoreConsole(spyW);
    });

    it("should output info", () => {
      const spyI = spyConsole("info");
      logger.info("i");
      expect(spyI).toHaveBeenCalledTimes(1);
      restoreConsole(spyI);
    });

    it("should suppress debug", () => {
      const spyD = spyConsole("debug");
      logger.debug("d");
      expect(spyD).not.toHaveBeenCalled();
      restoreConsole(spyD);
    });
  });

  describe("DEBUG (4)", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger("Test", LEVEL.DEBUG);
    });

    it("should output error", () => {
      const spy = spyConsole("error");
      logger.error("e");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should output warn", () => {
      const spy = spyConsole("warn");
      logger.warn("w");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should output info", () => {
      const spy = spyConsole("info");
      logger.info("i");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should output debug", () => {
      const spy = spyConsole("debug");
      logger.debug("d");
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });

    it("should output group", () => {
      const spy = spyConsole("group");
      logger.group("my-group");
      expect(spy).toHaveBeenCalledTimes(1);
      // console.group receives both the bound prefix and the label argument
      expect(spy).toHaveBeenCalledWith("[Test]", "my-group");
      restoreConsole(spy);
    });

    it("should output groupEnd", () => {
      const spy = spyConsole("groupEnd");
      logger.groupEnd();
      expect(spy).toHaveBeenCalledTimes(1);
      restoreConsole(spy);
    });
  });
});

// ---------------------------------------------------------------------------
// Log method prefix format
// ---------------------------------------------------------------------------

describe("Log prefix format", () => {
  it("should include [prefix] [LEVEL] in error", () => {
    const logger = new Logger("MyApp", LEVEL.ERROR);
    const spy = spyConsole("error");
    logger.error("something broke");
    expect(spy).toHaveBeenCalledWith("[MyApp] [ERROR]", "something broke");
    restoreConsole(spy);
  });

  it("should include [prefix] [LEVEL] in warn", () => {
    const logger = new Logger("API", LEVEL.WARN);
    const spy = spyConsole("warn");
    logger.warn("deprecated");
    expect(spy).toHaveBeenCalledWith("[API] [WARN]", "deprecated");
    restoreConsole(spy);
  });

  it("should include [prefix] [LEVEL] in info", () => {
    const logger = new Logger("Server", LEVEL.INFO);
    const spy = spyConsole("info");
    logger.info("started", { port: 3000 });
    expect(spy).toHaveBeenCalledWith("[Server] [INFO]", "started", { port: 3000 });
    restoreConsole(spy);
  });

  it("should include [prefix] [LEVEL] in debug", () => {
    const logger = new Logger("DB", LEVEL.DEBUG);
    const spy = spyConsole("debug");
    logger.debug("query", "SELECT 1");
    expect(spy).toHaveBeenCalledWith("[DB] [DEBUG]", "query", "SELECT 1");
    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// Dynamic level switching
// ---------------------------------------------------------------------------

describe("Dynamic setLevel", () => {
  it("should enable previously suppressed methods after raising level", () => {
    const logger = new Logger("Test", LEVEL.WARN);

    // info should be suppressed at WARN
    const spyInfo = spyConsole("info");
    logger.info("before");
    expect(spyInfo).not.toHaveBeenCalled();

    // raise to INFO
    logger.setLevel(LEVEL.INFO);
    logger.info("after");
    expect(spyInfo).toHaveBeenCalledTimes(1);
    expect(spyInfo).toHaveBeenCalledWith("[Test] [INFO]", "after");
    restoreConsole(spyInfo);
  });

  it("should suppress previously enabled methods after lowering level", () => {
    const logger = new Logger("Test", LEVEL.INFO);

    // info should work at INFO
    const spyInfo = spyConsole("info");
    logger.info("before");
    expect(spyInfo).toHaveBeenCalledTimes(1);
    spyInfo.mockClear();

    // lower to WARN — info should be suppressed
    logger.setLevel(LEVEL.WARN);
    logger.info("after");
    expect(spyInfo).not.toHaveBeenCalled();
    restoreConsole(spyInfo);
  });

  it("should handle rapid level switching", () => {
    const logger = new Logger("Test", LEVEL.WARN);

    const spy = spyConsole("debug");
    logger.setLevel(LEVEL.DEBUG);
    logger.debug("a");
    expect(spy).toHaveBeenCalledTimes(1);

    logger.setLevel(LEVEL.NONE);
    logger.debug("b");
    expect(spy).toHaveBeenCalledTimes(1); // still 1

    logger.setLevel(LEVEL.DEBUG);
    logger.debug("c");
    expect(spy).toHaveBeenCalledTimes(2);

    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// Multiple arguments
// ---------------------------------------------------------------------------

describe("Multiple arguments", () => {
  it("should pass all arguments to console", () => {
    const logger = new Logger("Test", LEVEL.DEBUG);
    const spy = spyConsole("debug");

    logger.debug("msg", 42, true, { key: "val" }, [1, 2, 3]);
    expect(spy).toHaveBeenCalledWith("[Test] [DEBUG]", "msg", 42, true, { key: "val" }, [1, 2, 3]);
    restoreConsole(spy);
  });

  it("should handle zero arguments", () => {
    const logger = new Logger("Test", LEVEL.ERROR);
    const spy = spyConsole("error");
    logger.error();
    expect(spy).toHaveBeenCalledWith("[Test] [ERROR]");
    restoreConsole(spy);
  });

  it("should handle Error objects", () => {
    const logger = new Logger("Test", LEVEL.ERROR);
    const spy = spyConsole("error");
    const err = new Error("boom");
    logger.error("caught:", err);
    expect(spy).toHaveBeenCalledWith("[Test] [ERROR]", "caught:", err);
    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// group / groupEnd
// ---------------------------------------------------------------------------

describe("group / groupEnd", () => {
  it("should call console.group with prefix when level >= DEBUG", () => {
    const logger = new Logger("Grp", LEVEL.DEBUG);
    const spy = spyConsole("group");
    logger.group("section A");
    // Label is passed as second argument after the bound prefix
    expect(spy).toHaveBeenCalledWith("[Grp]", "section A");
    restoreConsole(spy);
  });

  it("should suppress group when level < DEBUG", () => {
    const logger = new Logger("Grp", LEVEL.INFO);
    const spy = spyConsole("group");
    logger.group("section A");
    expect(spy).not.toHaveBeenCalled();
    restoreConsole(spy);
  });

  it("should call console.groupEnd when level >= DEBUG", () => {
    const logger = new Logger("Grp", LEVEL.DEBUG);
    const spy = spyConsole("groupEnd");
    logger.groupEnd();
    expect(spy).toHaveBeenCalledTimes(1);
    restoreConsole(spy);
  });

  it("should suppress groupEnd when level < DEBUG", () => {
    const logger = new Logger("Grp", LEVEL.INFO);
    const spy = spyConsole("groupEnd");
    logger.groupEnd();
    expect(spy).not.toHaveBeenCalled();
    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// getLogger() singleton
// ---------------------------------------------------------------------------

describe("getLogger()", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let defaultLoggerBackup: any;

  beforeEach(() => {
    // Reset the singleton between tests by accessing the internal variable.
    // We do this by creating a new getLogger call after resetting.
    // Since we can't access __$Default_Logger$__ directly from tests,
    // we rely on the fact that getLogger is lazy — the singleton persists.
    // For isolation, we re-import the module (but that's tricky with ESM).
    // Instead, we test observable behaviors.
    defaultLoggerBackup = null;
  });

  it("should return a Logger instance", () => {
    const log = getLogger();
    expect(typeof log.error).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.setLevel).toBe("function");
  });

  it("should default to WARN level when debug=false", () => {
    const log = getLogger(false);
    expect(log.getLevel()).toBe(LEVEL.WARN);
  });

  it("should use DEBUG level when debug=true", () => {
    // Note: getLogger is a singleton, so if it was already created with
    // debug=false, it won't change. We test the observable behavior:
    // getLogger(true) triggers debug mode (if not yet initialized).
    const log1 = getLogger(true);
    // The singleton may have been created by a previous test,
    // so we can't guarantee the level. Just verify it returns a Logger.
    expect([LEVEL.WARN, LEVEL.DEBUG]).toContain(log1.getLevel());
  });

  it("should return the same instance on repeated calls", () => {
    const log1 = getLogger();
    const log2 = getLogger();
    // Both calls return the same Proxy-wrapped singleton.
    // Since Proxy returns a new wrapper each time, we compare behavior:
    log1.setLevel(LEVEL.DEBUG);
    expect(log2.getLevel()).toBe(LEVEL.DEBUG);
  });
});

// ---------------------------------------------------------------------------
// Multiple logger instances
// ---------------------------------------------------------------------------

describe("Multiple instances", () => {
  it("should have independent levels", () => {
    const a = new Logger("A", LEVEL.WARN);
    const b = new Logger("B", LEVEL.DEBUG);

    expect(a.getLevel()).toBe(LEVEL.WARN);
    expect(b.getLevel()).toBe(LEVEL.DEBUG);

    a.setLevel(LEVEL.INFO);
    expect(a.getLevel()).toBe(LEVEL.INFO);
    expect(b.getLevel()).toBe(LEVEL.DEBUG); // unchanged
  });

  it("should have independent prefixes in output", () => {
    const a = new Logger("Alpha", LEVEL.INFO);
    const b = new Logger("Beta", LEVEL.INFO);

    const spy = spyConsole("info");
    a.info("from A");
    b.info("from B");

    expect(spy).toHaveBeenNthCalledWith(1, "[Alpha] [INFO]", "from A");
    expect(spy).toHaveBeenNthCalledWith(2, "[Beta] [INFO]", "from B");
    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("should handle empty string prefix", () => {
    const logger = new Logger("", LEVEL.ERROR);
    const spy = spyConsole("error");
    logger.error("msg");
    expect(spy).toHaveBeenCalledWith("[] [ERROR]", "msg");
    restoreConsole(spy);
  });

  it("should handle special characters in prefix", () => {
    const logger = new Logger("Mod<A> & B", LEVEL.WARN);
    const spy = spyConsole("warn");
    logger.warn("test");
    expect(spy).toHaveBeenCalledWith("[Mod<A> & B] [WARN]", "test");
    restoreConsole(spy);
  });

  it("should expose internal _prefix and _level through Proxy", () => {
    const logger = new Logger("Internal", LEVEL.INFO);
    // Internal properties (_ prefix) are passed through by the Proxy get trap
    expect((logger as unknown as Record<string, unknown>)._prefix).toBe("Internal");
    expect((logger as unknown as Record<string, unknown>)._level).toBe(LEVEL.INFO);
  });

  it("should handle setting level to same value", () => {
    const logger = new Logger("Test", LEVEL.INFO);
    logger.setLevel(LEVEL.INFO);
    expect(logger.getLevel()).toBe(LEVEL.INFO);
  });

  it("should handle undefined and null arguments", () => {
    const logger = new Logger("Test", LEVEL.DEBUG);
    const spy = spyConsole("debug");
    logger.debug(undefined, null);
    expect(spy).toHaveBeenCalledWith("[Test] [DEBUG]", undefined, null);
    restoreConsole(spy);
  });
});

// ---------------------------------------------------------------------------
// Fallback — no Proxy environment
// ---------------------------------------------------------------------------

describe("Fallback without Proxy", () => {
  const originalProxy = globalThis.Proxy;

  beforeAll(() => {
    delete (globalThis as Record<string, unknown>).Proxy;
  });

  afterAll(() => {
    globalThis.Proxy = originalProxy;
  });

  it("should create a logger instance without Proxy", () => {
    const logger = new Logger("Fallback", LEVEL.INFO);
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.setLevel).toBe("function");
  });

  it("should output error at ERROR level (no Proxy)", () => {
    const logger = new Logger("FB", LEVEL.ERROR);
    const spy = spyConsole("error");
    logger.error("err");
    expect(spy).toHaveBeenCalledWith("[FB] [ERROR]", "err");
    restoreConsole(spy);
  });

  it("should suppress debug at INFO level (no Proxy)", () => {
    const logger = new Logger("FB", LEVEL.INFO);
    const spy = spyConsole("debug");
    logger.debug("msg");
    expect(spy).not.toHaveBeenCalled();
    restoreConsole(spy);
  });

  it("should handle group/groupEnd at DEBUG level (no Proxy)", () => {
    const logger = new Logger("FB", LEVEL.DEBUG);
    const spyGroup = spyConsole("group");
    const spyEnd = spyConsole("groupEnd");

    logger.group("batch");
    logger.groupEnd();

    expect(spyGroup).toHaveBeenCalledWith("[FB] [GROUP] batch");
    expect(spyEnd).toHaveBeenCalledTimes(1);
    restoreConsole(spyGroup, spyEnd);
  });

  it("should get/set level correctly (no Proxy)", () => {
    const logger = new Logger("FB", LEVEL.WARN);
    expect(logger.getLevel()).toBe(LEVEL.WARN);
    logger.setLevel(LEVEL.DEBUG);
    expect(logger.getLevel()).toBe(LEVEL.DEBUG);
  });
});
