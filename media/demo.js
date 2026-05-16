// ================================================================
//  Demo Application
// ================================================================
(function () {
  const Logger = window.Logger;
  const LEVEL = Logger.LEVEL;

  const levelNames = ["NONE", "ERROR", "WARN", "INFO", "DEBUG"];

  // ---- Create loggers ----
  let logger = new Logger("Demo", LEVEL.WARN);
  let apiLogger = new Logger("API", LEVEL.INFO);

  // ---- DOM refs ----
  const outputCount = document.getElementById("outputCount");
  const currentLevelBadge = document.getElementById("currentLevelBadge");
  const levelDesc = document.getElementById("levelDesc");
  const levelBtns = document.querySelectorAll(".level-btn");
  const prefixInput = document.getElementById("prefixInput");

  const logCount = 0;
  const firstLog = true;

  function escapeHtml(s) {
    const el = document.createElement("span");
    el.textContent = s;
    return el.innerHTML;
  }

  // ---- Rebuild loggers when prefix changes ----
  function rebuildLoggers() {
    const prefix = prefixInput.value.trim() || "Logger";
    const lvl = logger.getLevel();
    const apiLvl = apiLogger.getLevel();
    logger = new Logger(prefix, lvl);
    apiLogger = new Logger(prefix + ".API", apiLvl);
  }

  prefixInput.addEventListener("input", function () {
    rebuildLoggers();
  });

  // ---- Level switching ----
  function updateLevelUI(lvl) {
    levelBtns.forEach(function (btn) {
      const btnLvl = parseInt(btn.getAttribute("data-level"), 10);
      if (btnLvl === lvl) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    const name = levelNames[lvl];
    currentLevelBadge.textContent = name;

    const parts = [];
    if (lvl >= 1) parts.push('<span style="color:#ff4d6a">error</span>');
    if (lvl >= 2) parts.push('<span style="color:#ffb347">warn</span>');
    if (lvl >= 3) parts.push('<span style="color:#4da6ff">info</span>');
    if (lvl >= 4) parts.push('<span style="color:#5cdb5c">debug</span>');

    levelDesc.innerHTML = lvl === 0 ? "Current = <strong>NONE</strong> — all logs suppressed." : "Current = <strong>" + name + "</strong> — " + parts.join(" + ") + " are shown.";
  }

  levelBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const lvl = parseInt(btn.getAttribute("data-level"), 10);
      logger.setLevel(lvl);
      apiLogger.setLevel(lvl);
      updateLevelUI(lvl);
    });
  });

  // ---- Action buttons ----
  document.getElementById("btnError").addEventListener("click", function () {
    logger.error("Connection failed", {
      code: 500,
      reason: "timeout",
    });
  });

  document.getElementById("btnWarn").addEventListener("click", function () {
    logger.warn("Deprecated endpoint called", {
      path: "/v1/old",
      migrate: "/v2/new",
    });
  });

  document.getElementById("btnInfo").addEventListener("click", function () {
    logger.info("Server started", {
      port: 3000,
      env: "development",
    });
    apiLogger.info("GET /api/users", {
      status: 200,
      duration: "42ms",
    });
  });

  document.getElementById("btnDebug").addEventListener("click", function () {
    logger.debug("Request payload", {
      method: "POST",
      url: "/api/data",
      body: { id: 1, name: "test" },
    });
  });

  document.getElementById("btnGroup").addEventListener("click", function () {
    logger.group("Batch Processing #42");
    logger.debug("Step 1/4 — validate input");
    logger.debug("Step 2/4 — transform data");
    logger.info("Step 3/4 — write to DB");
    logger.debug("Step 4/4 — invalidate cache");
    logger.groupEnd();
  });

  document.getElementById("btnAll").addEventListener("click", function () {
    logger.debug("Debug-level message");
    logger.info("Info-level message");
    logger.warn("Warn-level message");
    logger.error("Error-level message");
  });

  // ---- Init ----
  updateLevelUI(LEVEL.WARN);

  console.log("Demo initialized. Use the buttons above to generate logs with different levels and prefixes.");
  console.info("Try changing the prefix in the input box to see how it affects log output.");
  console.warn("Use the level buttons to filter logs by severity.");
  console.error("This is an error message to demonstrate the default console behavior before any logs are generated.");
  console.debug("This debug message may not appear if the default console level is higher than DEBUG.");
})();
