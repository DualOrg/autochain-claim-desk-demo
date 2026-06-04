import {
  MAINNET_CUTOVER_FLAG,
  networkMigrationPreflight,
  readiness
} from "../api/_dual.js";

const MANAGED_ENV_KEYS = [
  "DUAL_NETWORK",
  "AUTOCHAIN_DUAL_NETWORK",
  MAINNET_CUTOVER_FLAG,
  "DUAL_MAINNET_CUTOVER_CONFIRMED",
  "DUAL_API_URL",
  "DUAL_L3_EXPLORER_BASE_URL",
  "DUAL_L2_EXPLORER_BASE_URL",
  "DUAL_API_KEY",
  "DUAL_ORG_ID",
  "DUAL_AUTOCHAIN_TEMPLATE_ID",
  "DUAL_AUTOCHAIN_CLAIM_OBJECT_ID",
  "DEMO_OPERATOR_TOKEN",
  "DUAL_WRITE_MODE",
  "DUAL_PERSISTENCE_MODE"
];

function snapshotEnv(keys) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function applyEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }
}

function withEnv(values, fn) {
  const keys = [...new Set([...MANAGED_ENV_KEYS, ...Object.keys(values)])];
  const snapshot = snapshotEnv(keys);
  applyEnv(values);
  try {
    return fn();
  } finally {
    restoreEnv(snapshot);
  }
}

function endpointSummary(endpoint) {
  return {
    key: endpoint.key,
    explicit: endpoint.explicit,
    kind: endpoint.kind,
    blocks_mainnet: endpoint.blocks_mainnet
  };
}

function preflightSummary(preflight) {
  return {
    ready: preflight.ready,
    status: preflight.status,
    target_network: preflight.target_network,
    mainnet_requested: preflight.mainnet_requested,
    mainnet_cutover_confirmed: preflight.mainnet_cutover_confirmed,
    read_allowed: preflight.read_allowed,
    write_allowed: preflight.write_allowed,
    api_url_kind: preflight.api_url_kind,
    l3_explorer_url_kind: preflight.l3_explorer_url_kind,
    l2_explorer_url_kind: preflight.l2_explorer_url_kind,
    using_default_api_url: preflight.using_default_api_url,
    using_default_l3_explorer_url: preflight.using_default_l3_explorer_url,
    using_default_l2_explorer_url: preflight.using_default_l2_explorer_url,
    testnet_or_legacy_endpoint_count: preflight.testnet_or_legacy_endpoint_count,
    missing: preflight.missing,
    endpoints: preflight.endpoints.map(endpointSummary)
  };
}

function readinessSummary(status) {
  return {
    ok: status.ok,
    targetNetwork: status.targetNetwork,
    persistenceMode: status.persistenceMode,
    writeMode: status.writeMode,
    readbackReady: status.readbackReady,
    writable: status.writable,
    operatorGateConfigured: status.operatorGateConfigured,
    publicWrites: status.publicWrites,
    missing: status.missing,
    detail: status.detail
  };
}

function runCheck(name, fn) {
  try {
    const result = fn();
    return {
      name,
      passed: Boolean(result.passed),
      ...result
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error.message || "Check failed"
    };
  }
}

const checks = [
  runCheck("default_testnet_mode_is_not_a_mainnet_claim", () => withEnv({
    DUAL_NETWORK: null,
    AUTOCHAIN_DUAL_NETWORK: null,
    [MAINNET_CUTOVER_FLAG]: null,
    DUAL_MAINNET_CUTOVER_CONFIRMED: null,
    DUAL_API_URL: null,
    DUAL_L3_EXPLORER_BASE_URL: null,
    DUAL_L2_EXPLORER_BASE_URL: null,
    DUAL_API_KEY: null,
    DUAL_AUTOCHAIN_TEMPLATE_ID: null,
    DUAL_AUTOCHAIN_CLAIM_OBJECT_ID: null,
    DEMO_OPERATOR_TOKEN: null,
    DUAL_WRITE_MODE: null,
    DUAL_PERSISTENCE_MODE: null
  }, () => {
    const preflight = networkMigrationPreflight();
    const status = readiness();
    return {
      passed: preflight.ready === true
        && preflight.mainnet_requested === false
        && preflight.target_network === "testnet"
        && preflight.api_url_kind === "testnet_api"
        && preflight.l3_explorer_url_kind === "testnet_l3_explorer"
        && preflight.l2_explorer_url_kind === "testnet_l2_explorer"
        && status.readbackReady === false
        && status.writable === false,
      preflight: preflightSummary(preflight),
      readiness: readinessSummary(status)
    };
  })),

  runCheck("mainnet_mode_with_defaults_fails_closed", () => withEnv({
    DUAL_NETWORK: "mainnet",
    AUTOCHAIN_DUAL_NETWORK: null,
    [MAINNET_CUTOVER_FLAG]: null,
    DUAL_MAINNET_CUTOVER_CONFIRMED: null,
    DUAL_API_URL: null,
    DUAL_L3_EXPLORER_BASE_URL: null,
    DUAL_L2_EXPLORER_BASE_URL: null,
    DUAL_API_KEY: "dummy-read-key",
    DUAL_ORG_ID: "dummy-org",
    DUAL_AUTOCHAIN_TEMPLATE_ID: "dummy-template",
    DUAL_AUTOCHAIN_CLAIM_OBJECT_ID: "dummy-object",
    DEMO_OPERATOR_TOKEN: "x".repeat(40),
    DUAL_WRITE_MODE: "event_bus",
    DUAL_PERSISTENCE_MODE: "dual"
  }, () => {
    const preflight = networkMigrationPreflight();
    const status = readiness();
    return {
      passed: preflight.ready === false
        && preflight.mainnet_requested === true
        && preflight.read_allowed === false
        && preflight.write_allowed === false
        && preflight.missing.includes(`${MAINNET_CUTOVER_FLAG}=true`)
        && preflight.missing.includes("DUAL_API_URL=mainnet_api_base")
        && preflight.missing.includes("DUAL_L3_EXPLORER_BASE_URL=mainnet_l3_explorer_base")
        && preflight.missing.includes("DUAL_L2_EXPLORER_BASE_URL=mainnet_l2_explorer_base")
        && preflight.missing.includes("DUAL_API_URL_not_testnet_or_legacy")
        && preflight.missing.includes("DUAL_L3_EXPLORER_BASE_URL_not_testnet_or_legacy")
        && preflight.missing.includes("DUAL_L2_EXPLORER_BASE_URL_not_testnet_or_legacy")
        && status.readbackReady === false
        && status.writable === false,
      preflight: preflightSummary(preflight),
      readiness: readinessSummary(status)
    };
  })),

  runCheck("mainnet_mode_with_explicit_non_testnet_endpoints_passes_preflight_only", () => withEnv({
    DUAL_NETWORK: "mainnet",
    AUTOCHAIN_DUAL_NETWORK: null,
    [MAINNET_CUTOVER_FLAG]: "true",
    DUAL_MAINNET_CUTOVER_CONFIRMED: null,
    DUAL_API_URL: "https://api-mainnet.example.invalid",
    DUAL_L3_EXPLORER_BASE_URL: "https://explorer-mainnet.example.invalid",
    DUAL_L2_EXPLORER_BASE_URL: "https://explorer-v2-mainnet.example.invalid",
    DUAL_API_KEY: null,
    DUAL_ORG_ID: null,
    DUAL_AUTOCHAIN_TEMPLATE_ID: null,
    DUAL_AUTOCHAIN_CLAIM_OBJECT_ID: null,
    DEMO_OPERATOR_TOKEN: null,
    DUAL_WRITE_MODE: null,
    DUAL_PERSISTENCE_MODE: null
  }, () => {
    const preflight = networkMigrationPreflight();
    const status = readiness();
    return {
      passed: preflight.ready === true
        && preflight.mainnet_requested === true
        && preflight.api_url_kind === "custom"
        && preflight.l3_explorer_url_kind === "custom"
        && preflight.l2_explorer_url_kind === "custom"
        && preflight.testnet_or_legacy_endpoint_count === 0
        && status.readbackReady === false
        && status.writable === false,
      preflight: preflightSummary(preflight),
      readiness: readinessSummary(status)
    };
  })),

  runCheck("current_environment_network_config_is_not_blocked", () => {
    const preflight = networkMigrationPreflight();
    const status = readiness();
    return {
      passed: preflight.ready === true,
      preflight: preflightSummary(preflight),
      readiness: readinessSummary(status),
      note: "This check does not call the DUAL API and does not run setup, mint, sync, or gate-advance writes."
    };
  })
];

const ok = checks.every((check) => check.passed);

console.log(JSON.stringify({
  ok,
  service: "dual-autochain-claim-desk",
  check: "mainnet_migration_preflight",
  secret_returned: false,
  public_writes: false,
  live_dual_calls: false,
  checks
}, null, 2));

if (!ok) process.exit(1);
