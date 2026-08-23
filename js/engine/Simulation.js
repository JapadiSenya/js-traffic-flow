import { Vehicle } from '../model/index.js';
import { idmAcceleration } from './idm.js';
import { mobilDecision } from './mobil.js';
import { FixedTimeSignalController } from './signalControl.js';
import { chooseNextConnection } from './routing.js';
import { InflowSpawner } from './spawner.js';
import { buildLaneLengthMap } from './laneGeometry.js';

const MIN_SPAWN_GAP = 8; // 流入時、レーン先頭にこの距離以上の空きがなければ生成を見送る[m]

function randomInRange([min, max], rng) {
  return min + rng() * (max - min);
}

/**
 * シミュレーション全体のタイムステップ管理。
 * IDM/MOBILによる追従・車線変更、信号制御、ルーティング、継続流入を統合する。
 * リーダー探索(findLeader)は、合流時の受動的な減速反応を成立させる核であり、
 * 将来の協調的レーンチェンジ拡張のために独立したメソッドとして分離してある。
 */
export class Simulation {
  constructor({ network, config, rng = Math.random }) {
    this.network = network;
    this.config = config;
    this.rng = rng;
    this.time = 0;

    this.nodeById = new Map(network.nodes.map((n) => [n.id, n]));
    this.edgeById = new Map(network.edges.map((e) => [e.id, e]));
    this.laneById = new Map(network.lanes.map((l) => [l.id, l]));
    this.laneLength = buildLaneLengthMap(network);

    this.signalControllers = new Map();
    for (const signal of network.signals) {
      this.signalControllers.set(signal.nodeId, new FixedTimeSignalController(signal));
    }

    this.spawners = (config.inflows ?? []).map((inflow) => new InflowSpawner(inflow, this.rng));

    this.vehicles = new Map();
    this.vehiclesByLane = new Map(network.lanes.map((l) => [l.id, []]));
    this.nextLaneOf = new Map();

    this._idCounter = 0;

    for (const initial of config.initialVehicles ?? []) {
      this.addVehicle({
        laneId: initial.laneId,
        s: initial.s,
        speed: initial.speed,
      });
    }
  }

  generateVehicleId() {
    this._idCounter += 1;
    return `vehicle-${this._idCounter}`;
  }

  addVehicle({ laneId, s, speed }) {
    const vehicle = new Vehicle({
      id: this.generateVehicleId(),
      laneId,
      s,
      speed,
      idm: { ...this.config.idmDefaults },
      mobil: { ...this.config.mobilDefaults },
      reactionInterval: randomInRange(this.config.reactionIntervalRange, this.rng),
    });
    this.vehicles.set(vehicle.id, vehicle);
    this.insertIntoLane(vehicle);
    this.nextLaneOf.set(vehicle.id, this.decideNextLane(vehicle));
    return vehicle;
  }

  insertIntoLane(vehicle) {
    const arr = this.vehiclesByLane.get(vehicle.laneId);
    arr.push(vehicle.id);
    arr.sort((a, b) => this.vehicles.get(a).s - this.vehicles.get(b).s);
  }

  removeFromLane(vehicle) {
    const arr = this.vehiclesByLane.get(vehicle.laneId);
    const idx = arr.indexOf(vehicle.id);
    if (idx >= 0) arr.splice(idx, 1);
  }

  decideNextLane(vehicle) {
    const lane = this.laneById.get(vehicle.laneId);
    const conn = chooseNextConnection(lane, this.rng);
    return conn ? conn.toLaneId : null;
  }

  /**
   * 車両の直近リーダーを探索する。同一車線内に前方車両がいなければ、
   * 交差点の信号現示(赤/黄なら停止線を仮想リーダーとする)を確認したうえで
   * 次車線側の先頭車両を見に行く。合流車両が割り込んだ場合も、この探索が
   * 動的にvehiclesByLaneを参照するため、本線車両は次のupdateAccelerationで
   * 自然に新しいリーダーを認識する(受動的反応)。
   */
  findLeader(vehicle) {
    const arr = this.vehiclesByLane.get(vehicle.laneId);
    const idx = arr.indexOf(vehicle.id);

    if (idx < arr.length - 1) {
      const leader = this.vehicles.get(arr[idx + 1]);
      return { gap: leader.s - vehicle.s - leader.length, speed: leader.speed };
    }

    const laneLength = this.laneLength.get(vehicle.laneId);
    const distToEnd = laneLength - vehicle.s;
    const nextLaneId = this.nextLaneOf.get(vehicle.id);
    if (!nextLaneId) return null;

    const lane = this.laneById.get(vehicle.laneId);
    const edge = this.edgeById.get(lane.edgeId);
    const connection = lane.connections.find((c) => c.toLaneId === nextLaneId);
    const movement = connection ? connection.movement : 'through';
    const controller = this.signalControllers.get(edge.endNodeId);
    const allowed = !controller || controller.isMovementAllowed(lane.id, movement);

    if (!allowed) {
      return { gap: distToEnd, speed: 0 };
    }

    const nextArr = this.vehiclesByLane.get(nextLaneId);
    if (nextArr.length === 0) return null;

    const nextLeader = this.vehicles.get(nextArr[0]);
    return { gap: distToEnd + nextLeader.s - nextLeader.length, speed: nextLeader.speed };
  }

  computeAcceleration(vehicle) {
    const lane = this.laneById.get(vehicle.laneId);
    const edge = this.edgeById.get(lane.edgeId);
    const leader = this.findLeader(vehicle);
    return idmAcceleration(vehicle, leader ? leader.gap : null, leader ? leader.speed : 0, edge.grade);
  }

  findAdjacentLane(edge, index) {
    return this.network.lanes.find((l) => l.edgeId === edge.id && l.index === index) ?? null;
  }

  tryLaneChange(vehicle, currentLane, targetLane, edge) {
    const currentAccel = vehicle.acceleration;

    const targetArr = this.vehiclesByLane.get(targetLane.id);
    let newFollowerId = null;
    let newLeaderId = null;
    for (const id of targetArr) {
      const v = this.vehicles.get(id);
      if (v.s <= vehicle.s) {
        if (!newFollowerId || v.s > this.vehicles.get(newFollowerId).s) newFollowerId = id;
      } else if (!newLeaderId || v.s < this.vehicles.get(newLeaderId).s) {
        newLeaderId = id;
      }
    }

    const newLeader = newLeaderId ? this.vehicles.get(newLeaderId) : null;
    const newLaneAccel = idmAcceleration(
      vehicle,
      newLeader ? newLeader.s - vehicle.s - newLeader.length : null,
      newLeader ? newLeader.speed : 0,
      edge.grade
    );

    const newFollower = newFollowerId ? this.vehicles.get(newFollowerId) : null;
    const newFollowerAccelBefore = newFollower ? this.computeAcceleration(newFollower) : 0;
    const newFollowerAccelAfter = newFollower
      ? idmAcceleration(newFollower, vehicle.s - newFollower.s - vehicle.length, vehicle.speed, edge.grade)
      : 0;

    const currentArr = this.vehiclesByLane.get(currentLane.id);
    const idx = currentArr.indexOf(vehicle.id);
    const oldFollowerId = idx > 0 ? currentArr[idx - 1] : null;
    const oldLeaderId = idx < currentArr.length - 1 ? currentArr[idx + 1] : null;
    const oldFollower = oldFollowerId ? this.vehicles.get(oldFollowerId) : null;
    const oldLeader = oldLeaderId ? this.vehicles.get(oldLeaderId) : null;

    const oldFollowerAccelBefore = oldFollower ? this.computeAcceleration(oldFollower) : 0;
    const oldFollowerAccelAfter = oldFollower
      ? idmAcceleration(
          oldFollower,
          oldLeader ? oldLeader.s - oldFollower.s - oldLeader.length : null,
          oldLeader ? oldLeader.speed : 0,
          edge.grade
        )
      : 0;

    const shouldChange = mobilDecision({
      currentAccel,
      newLaneAccel,
      newFollowerAccelBefore,
      newFollowerAccelAfter,
      oldFollowerAccelBefore,
      oldFollowerAccelAfter,
      mobilParams: vehicle.mobil,
    });

    if (!shouldChange) return false;

    this.removeFromLane(vehicle);
    vehicle.laneId = targetLane.id;
    this.insertIntoLane(vehicle);
    this.nextLaneOf.set(vehicle.id, this.decideNextLane(vehicle));
    return true;
  }

  evaluateLaneChanges() {
    for (const vehicle of this.vehicles.values()) {
      const lane = this.laneById.get(vehicle.laneId);
      const edge = this.edgeById.get(lane.edgeId);

      const candidateIndices = [];
      if (lane.laneChange.left) candidateIndices.push(lane.index - 1);
      if (lane.laneChange.right) candidateIndices.push(lane.index + 1);

      for (const index of candidateIndices) {
        const targetLane = this.findAdjacentLane(edge, index);
        if (targetLane && this.tryLaneChange(vehicle, lane, targetLane, edge)) break;
      }
    }
  }

  updateSpawners(dt) {
    for (const spawner of this.spawners) {
      if (!spawner.update(dt)) continue;

      const lanesOfEdge = this.network.lanes.filter((l) => l.edgeId === spawner.edgeId);
      for (const lane of lanesOfEdge) {
        const arr = this.vehiclesByLane.get(lane.id);
        const headVehicle = arr.length > 0 ? this.vehicles.get(arr[0]) : null;
        const hasSpace = !headVehicle || headVehicle.s > MIN_SPAWN_GAP;
        if (hasSpace) {
          this.addVehicle({ laneId: lane.id, s: 0, speed: 0 });
          break;
        }
      }
    }
  }

  handleLaneTransitions() {
    for (const vehicle of Array.from(this.vehicles.values())) {
      const laneLength = this.laneLength.get(vehicle.laneId);
      if (vehicle.s < laneLength) continue;

      const overflow = vehicle.s - laneLength;
      const nextLaneId = this.nextLaneOf.get(vehicle.id);

      this.removeFromLane(vehicle);

      if (!nextLaneId) {
        this.vehicles.delete(vehicle.id);
        this.nextLaneOf.delete(vehicle.id);
        continue;
      }

      vehicle.laneId = nextLaneId;
      vehicle.s = overflow;
      this.insertIntoLane(vehicle);
      this.nextLaneOf.set(vehicle.id, this.decideNextLane(vehicle));
    }
  }

  /**
   * シミュレーションをdt秒進める。
   */
  step(dt) {
    this.time += dt;

    for (const controller of this.signalControllers.values()) {
      controller.update(dt);
    }

    this.updateSpawners(dt);

    for (const vehicle of this.vehicles.values()) {
      if (this.time >= vehicle.nextUpdateTime) {
        vehicle.acceleration = this.computeAcceleration(vehicle);
        vehicle.nextUpdateTime = this.time + vehicle.reactionInterval;
      }
    }

    this.evaluateLaneChanges();

    for (const vehicle of this.vehicles.values()) {
      vehicle.speed = Math.max(0, vehicle.speed + vehicle.acceleration * dt);
      vehicle.s += vehicle.speed * dt;
    }

    this.handleLaneTransitions();
  }
}
