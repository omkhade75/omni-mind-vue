import * as fs from "fs";
import * as path from "path";
import type { DecisionNode } from "./decision-graph";

export interface DecisionRecord extends DecisionNode {
  feedbackAccepted?: boolean;
  actualRoi?: string;
  predictionAccuracy?: number;
}

export interface BusinessMemoryProvider {
  saveDecision(decision: DecisionRecord): Promise<void>;
  getRecentDecisions(limit?: number): Promise<DecisionRecord[]>;
  updateDecisionStatus(id: string, status: DecisionRecord["status"], outcome?: string, actualRoi?: string): Promise<void>;
}

export class FileMemoryProvider implements BusinessMemoryProvider {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), ".business_memory.json");
  }

  private loadFile(): DecisionRecord[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to read business memory file:", e);
    }
    return [];
  }

  private saveFile(records: DecisionRecord[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to business memory file:", e);
    }
  }

  public async saveDecision(decision: DecisionRecord): Promise<void> {
    const records = this.loadFile();
    const existingIndex = records.findIndex((r) => r.id === decision.id);
    if (existingIndex > -1) {
      records[existingIndex] = decision;
    } else {
      records.push(decision);
    }
    this.saveFile(records);
  }

  public async getRecentDecisions(limit: number = 20): Promise<DecisionRecord[]> {
    const records = this.loadFile();
    // Sort descending by timestamp
    return records
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public async updateDecisionStatus(
    id: string,
    status: DecisionRecord["status"],
    outcome?: string,
    actualRoi?: string,
  ): Promise<void> {
    const records = this.loadFile();
    const rec = records.find((r) => r.id === id);
    if (rec) {
      rec.status = status;
      if (outcome) rec.outcome = outcome;
      if (actualRoi) rec.actualRoi = actualRoi;
      this.saveFile(records);
    }
  }
}
