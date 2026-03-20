import type { AutomationSessionContext, DiscoveryDraft, VelesBrowserAdapter } from "@veles/shared";

export class DiscoveryService {
  public constructor(private readonly adapter: VelesBrowserAdapter) {}

  public async createDraft(session: AutomationSessionContext, workflowKey: string): Promise<DiscoveryDraft> {
    return this.adapter.discoverTemplateDraft(session, workflowKey);
  }
}
