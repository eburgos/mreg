"use strict";

export interface BaseConfig {
  enabled?: boolean; //If undefined then it's true
}

export interface LongUnitDescription {
  id: string;
  version: string;
}

export type UnitDescription = "string" | LongUnitDescription;

export interface UnitDefinition <C extends BaseConfig, U> extends LongUnitDescription {
  config: C | (() => Promise<C>);
  start:(
    config: C,
    getUnit: <X>(unitId: string) => X
  ) => Promise<U>;
  stop: () => Promise<void>;
}

interface UnitInstance extends UnitDefinition<any, any> {
  state: "starting" | "started" | "stopped";
  dependencies: { [id: string]: UnitInstance };
  value: any;
}

const registry: { [id: string]: UnitInstance } = {};

export function define<C extends BaseConfig, U>(consumes: UnitDescription[], unit: UnitDefinition<C, U>) {
  const normalizedDependencies: LongUnitDescription[] = (consumes || []).map(
    function(item) {
      const normalizedItem =
        typeof item === "string"
          ? { id: item, version: "*" }
          : !item.version
          ? { ...item, version: "*" }
          : item;

      return normalizedItem;
    }
  );

    if (registry[unit.id]) {
      throw new Error(`Unit "${unit.id}" already defined`);
    }
    const unitInstance: UnitInstance = {
      ...unit,
      value: undefined,
      state: "stopped",
      dependencies: normalizedDependencies.reduce((acc: {[id: string]: UnitInstance }, next) => {
        acc[next.id] = registry[next.id];
        if (!acc[next.id]) {
          throw new Error(`Unit "${unit.id}" has missing dependency "${next.id}"`);
        }
        return acc;
      }, {})
    };
    registry[unit.id] = unitInstance;
}

async function initOne(one: UnitInstance, queued: {[name: string]: boolean }): Promise<void> {
  const stopped = Object.values(one.dependencies).filter(dep => dep.state === "stopped");
  stopped.forEach(dep => { if (queued[dep.id]) { throw new Error(`Circular reference at "${dep.id}"`); }});

  await stopped.reduce(async (acc, next) => {
    await acc;
    await initOne(next, {...queued, [next.id]: true });
  }, Promise.resolve());

  const getUnit = (unitId: string): any => {
    if (one.dependencies[unitId]) {
      return one.dependencies[unitId];
    }
    throw new Error(`Unit "${one.id}" cannot reference "${unitId}" because it does not depend on it.`);
  };

  one.state = "starting";
  const config = typeof one.config === "function"? (await one.config()) : one.config;
  one.value = await one.start(config, getUnit);
  one.state = "started";
}

export function init(): Promise<void> {
  const stopped = Object.values(registry).filter(
    unit => unit.state === "stopped"
  );
  return stopped.reduce(async (acc, next) => {
    await acc;
    await initOne(next, {});
  }, Promise.resolve());
}
