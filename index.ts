"use strict";

export interface BaseConfig {
  enabled?: boolean; //If undefined then it's true
}

export interface LongUnitDescription {
  features?: { [feature: string]: any };
  id: string;
  version: string;
}

export type UnitDescription = "string" | LongUnitDescription;

export interface UnitDefinition<C extends BaseConfig, U>
  extends LongUnitDescription {
  config: C | (() => Promise<C>);
  start: (config: C, getUnit: <X>(unitId: string) => X) => Promise<U>;
  stop: (getUnit: <X>(unitId: string) => X) => Promise<void>;
}

interface UnitInstance extends UnitDefinition<any, any> {
  state: "starting" | "started" | "stopped";
  dependencies: LongUnitDescription[];
  dependencyInstances: { [id: string]: UnitInstance };
  value: any;
}

const registry: { [id: string]: UnitInstance } = {};

export function define<C extends BaseConfig, U>(
  consumes: UnitDescription[],
  unit: UnitDefinition<C, U>
) {
  const normalizedDependencies: LongUnitDescription[] = (consumes || []).map(
    function (item) {
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
    dependencies: normalizedDependencies,
    dependencyInstances: {}
  };
  registry[unit.id] = unitInstance;
}

async function initOne(
  one: UnitInstance,
  queued: { [name: string]: boolean }
): Promise<void> {
  one.state = "starting";
  const stopped = Object.values(one.dependencyInstances).filter(
    (dep) => dep.state === "stopped"
  );
  stopped.forEach((dep) => {
    if (queued[dep.id]) {
      throw new Error(`Circular reference at "${dep.id}"`);
    }
  });

  await stopped.reduce(async (acc, next) => {
    await acc;
    if (next.state === "started") {
      return acc;
    } else if (next.state === "starting") {
      throw new Error("Not supposed to happen");
    } else {
      await initOne(next, { ...queued, [next.id]: true });
    }
  }, Promise.resolve());

  const getUnit = (unitId: string): any => {
    if (one.dependencyInstances[unitId]) {
      return one.dependencyInstances[unitId].value;
    }
    throw new Error(
      `Unit "${one.id}" cannot reference "${unitId}" because it does not depend on it.`
    );
  };

  one.dependencies.reduce((acc: { [id: string]: UnitInstance }, next) => {
    acc[next.id] = registry[next.id];
    if (!acc[next.id]) {
      throw new Error(`Unit "${one.id}" has missing dependency "${next.id}"`);
    }
    const nextFeatures = next.features;
    if (typeof nextFeatures === "object") {
      Object.keys(nextFeatures).forEach((feature) => {
        const features = acc[next.id].features;
        if (typeof features !== "object") {
          throw new Error(
            `Unit "${one.id}" has a dependency "${next.id}" that needs a non-implemented feature "${feature}"`
          );
        }
        if (features[feature] !== nextFeatures[feature]) {
          throw new Error(
            `Unit "${one.id}" has a dependency "${next.id}" that requires feature "${feature}" = "${nextFeatures[feature]}" but the provider is "${features[feature]}"`
          );
        }
      });
    }
    return acc;
  }, one.dependencyInstances);

  const config =
    typeof one.config === "function" ? await one.config() : one.config;
  one.value = await one.start(config, getUnit);
  one.state = "started";
}

export function init(): Promise<void> {
  const stopped = Object.values(registry).filter(
    (unit) => unit.state === "stopped"
  );
  stopped.forEach((unit) => {
    unit.dependencies.forEach((dep) => {
      const depUnit = registry[dep.id];
      unit.dependencyInstances[dep.id] = depUnit;
    });
  });
  return stopped.reduce(async (acc, next) => {
    await acc;
    if (next.state === "started") {
      return acc;
    } else if (next.state === "starting") {
      throw new Error("Not supposed to happen");
    } else {
      await initOne(next, {});
    }
  }, Promise.resolve());
}
