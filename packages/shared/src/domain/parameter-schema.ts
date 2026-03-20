import type { ParameterValue, TimestampedEntity } from "./common.js";

export type ParameterValueType = "string" | "number" | "integer" | "boolean" | "enum";

export type LocatorStrategy = "role" | "label" | "testId" | "css" | "xpath" | "controlKey";

export interface LocatorDescriptor {
  strategy: LocatorStrategy;
  value: string;
  options?: Record<string, string | number | boolean>;
}

export interface ParameterDependency {
  key: string;
  equals?: ParameterValue;
  oneOf?: ParameterValue[];
  exists?: boolean;
}

export interface NumericRange {
  min: number;
  max: number;
  step?: number;
}

export interface ParameterDefinition {
  key: string;
  label: string;
  type: ParameterValueType;
  selector: LocatorDescriptor;
  allowedValues?: ParameterValue[];
  range?: NumericRange;
  dependencies?: ParameterDependency[];
  parserHints?: Record<string, unknown>;
  normalizationHints?: Record<string, unknown>;
}

export interface StrategyTemplate extends TimestampedEntity {
  id: string;
  templateKey: string;
  version: string;
  displayName: string;
  workflowKey: string;
  status: "draft" | "active" | "deprecated";
  parameterDefinitions: ParameterDefinition[];
  parserConfig?: Record<string, unknown>;
  normalizationConfig?: Record<string, unknown>;
}
