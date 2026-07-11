import type { ClaimProvenance } from "../tool-types";

export interface DecisionNode {
  id: string;
  parentId?: string;
  query: string;
  intent: string;
  businessDomain: string[];
  evidence: Record<string, string | number>;
  provenances: ClaimProvenance[];
  recommendation: string;
  expectedRoi?: string;
  owner?: string;
  deadline?: string;
  dependencies?: string[];
  status: "Accepted" | "Rejected" | "Completed" | "Ignored" | "Expired";
  timestamp: string;
  outcome?: string;
}

export class DecisionGraph {
  private nodes: Map<string, DecisionNode> = new Map();

  constructor(initialNodes: DecisionNode[] = []) {
    initialNodes.forEach((node) => {
      this.nodes.set(node.id, node);
    });
  }

  public addNode(node: DecisionNode): void {
    this.nodes.set(node.id, node);
  }

  public getNode(id: string): DecisionNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): DecisionNode[] {
    return Array.from(this.nodes.values());
  }

  public findCausalChain(nodeId: string): DecisionNode[] {
    const chain: DecisionNode[] = [];
    let current = this.getNode(nodeId);
    while (current) {
      chain.unshift(current);
      if (current.parentId) {
        current = this.getNode(current.parentId);
      } else {
        break;
      }
    }
    return chain;
  }

  public findRelatedDecisions(domain: string): DecisionNode[] {
    return this.getAllNodes().filter((n) => n.businessDomain.includes(domain));
  }
}
