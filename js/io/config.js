const DEFAULT_IDM = {
  desiredSpeed: 15,
  safeTimeHeadway: 1.5,
  maxAcceleration: 1.5,
  comfortableDeceleration: 2.0,
  minGap: 2.0,
};

const DEFAULT_MOBIL = {
  politeness: 0.3,
  changeThreshold: 0.2,
  safeBraking: 4.0,
};

/**
 * 設定ファイル(JSON互換オブジェクト)を読み込み、未指定項目をデフォルト値で補完する。
 * 車両初期配置・流入設定・時空間図の経路選択はプレーンオブジェクトのまま扱い、
 * Vehicleインスタンスへの変換はengine側の責務とする。
 */
export function deserializeConfig(json) {
  return {
    initialVehicles: json.initialVehicles ?? [],
    inflows: json.inflows ?? [],
    idmDefaults: { ...DEFAULT_IDM, ...(json.idmDefaults ?? {}) },
    mobilDefaults: { ...DEFAULT_MOBIL, ...(json.mobilDefaults ?? {}) },
    reactionIntervalRange: json.reactionIntervalRange ?? [0.2, 0.4],
    diagramRoute: json.diagramRoute ?? [],
  };
}

/**
 * 設定オブジェクトを設定ファイル(JSON互換オブジェクト)に変換する。
 */
export function serializeConfig(config) {
  return { ...config };
}
