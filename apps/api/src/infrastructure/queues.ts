import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@veles/shared";

import { redisConnectionOptionsFromUrl } from "./redis.js";

export interface ApiQueues {
  experimentPlanning: Queue;
  resultPostprocessing: Queue;
}

export function createApiQueues(redisUrl: string): ApiQueues {
  const connection = redisConnectionOptionsFromUrl(redisUrl);

  return {
    experimentPlanning: new Queue(QUEUE_NAMES.experimentPlanning, { connection }),
    resultPostprocessing: new Queue(QUEUE_NAMES.resultPostprocessing, { connection })
  };
}

export async function closeApiQueues(queues: ApiQueues): Promise<void> {
  await Promise.all([queues.experimentPlanning.close(), queues.resultPostprocessing.close()]);
}
