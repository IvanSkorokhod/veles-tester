-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'INVALID', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('SCREENSHOT', 'HTML_SNAPSHOT', 'NETWORK_LOG', 'TRACE', 'RAW_PAYLOAD', 'METRICS_JSON');

-- CreateTable
CREATE TABLE "UserAccountSession" (
    "id" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "sessionStateRef" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastValidatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "parameterSchemaJson" JSONB NOT NULL,
    "parserConfigJson" JSONB,
    "normalizationConfigJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterDefinition" (
    "id" TEXT NOT NULL,
    "strategyTemplateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "selector" JSONB NOT NULL,
    "allowedValuesJson" JSONB,
    "rangeConfigJson" JSONB,
    "dependenciesJson" JSONB,
    "parserHintsJson" JSONB,
    "normalizationHintsJson" JSONB,

    CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterSpace" (
    "id" TEXT NOT NULL,
    "strategyTemplateId" TEXT NOT NULL,
    "spaceConfigJson" JSONB NOT NULL,
    "searchPolicyJson" JSONB NOT NULL,
    "validationSummaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParameterSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategyTemplateId" TEXT NOT NULL,
    "parameterSpaceId" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "objectiveConfigJson" JSONB NOT NULL,
    "rankingProfileJson" JSONB NOT NULL,
    "stageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentRun" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "parameterHash" TEXT NOT NULL,
    "parameterValuesJson" JSONB NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "workerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunArtifact" (
    "id" TEXT NOT NULL,
    "experimentRunId" TEXT NOT NULL,
    "artifactType" "ArtifactType" NOT NULL,
    "storageRef" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "stepName" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestResult" (
    "id" TEXT NOT NULL,
    "experimentRunId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "netProfit" DOUBLE PRECISION,
    "tradeCount" INTEGER,
    "maxDrawdown" DOUBLE PRECISION,
    "rawPayloadJson" JSONB NOT NULL,
    "normalizedMetricsJson" JSONB NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "scoringConfigJson" JSONB NOT NULL,
    "filtersJson" JSONB,
    "rankedRunIdsJson" JSONB NOT NULL,
    "scoreBreakdownJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExecution" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT,
    "experimentRunId" TEXT,
    "queueName" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "enqueuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyTemplate_templateKey_version_key" ON "StrategyTemplate"("templateKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterDefinition_strategyTemplateId_key_key" ON "ParameterDefinition"("strategyTemplateId", "key");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "ExperimentRun_status_idx" ON "ExperimentRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentRun_experimentId_stageNumber_parameterHash_key" ON "ExperimentRun"("experimentId", "stageNumber", "parameterHash");

-- CreateIndex
CREATE UNIQUE INDEX "BacktestResult_experimentRunId_key" ON "BacktestResult"("experimentRunId");

-- CreateIndex
CREATE INDEX "JobExecution_queueName_jobName_state_idx" ON "JobExecution"("queueName", "jobName", "state");

-- AddForeignKey
ALTER TABLE "ParameterDefinition" ADD CONSTRAINT "ParameterDefinition_strategyTemplateId_fkey" FOREIGN KEY ("strategyTemplateId") REFERENCES "StrategyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParameterSpace" ADD CONSTRAINT "ParameterSpace_strategyTemplateId_fkey" FOREIGN KEY ("strategyTemplateId") REFERENCES "StrategyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_strategyTemplateId_fkey" FOREIGN KEY ("strategyTemplateId") REFERENCES "StrategyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_parameterSpaceId_fkey" FOREIGN KEY ("parameterSpaceId") REFERENCES "ParameterSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunArtifact" ADD CONSTRAINT "RunArtifact_experimentRunId_fkey" FOREIGN KEY ("experimentRunId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestResult" ADD CONSTRAINT "BacktestResult_experimentRunId_fkey" FOREIGN KEY ("experimentRunId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExecution" ADD CONSTRAINT "JobExecution_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExecution" ADD CONSTRAINT "JobExecution_experimentRunId_fkey" FOREIGN KEY ("experimentRunId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

