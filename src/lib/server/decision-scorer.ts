export interface ScoredRecommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low" | "critical";
  roi: string; // e.g. "12.5x"
  cost: string; // e.g. "₹5,000"
  owner: string;
  department: string;
  deadline: string;
  dependencies: string;
  riskIfIgnored: string;
  expectedOutcome: string;
  successProbability: number; // 0.0 - 1.0
  implementationTime: string;

  // Numerical parameters for MAUT ranking
  impactScore: number; // 1 - 10
  urgencyScore: number; // 1 - 10
  complexityScore: number; // 1 - 10
  costScore: number; // 1 - 10
  decisionScore: number; // calculated overall decision score
}

export class DecisionScorer {
  public static scoreAndSort(recommendations: ScoredRecommendation[]): ScoredRecommendation[] {
    return recommendations
      .map((rec) => {
        // MAUT: Score = (Impact * Urgency * SuccessProbability) / (Complexity * CostScore)
        // Ensure divisor is at least 1 to avoid infinity
        const complexity = Math.max(1, rec.complexityScore);
        const costVal = Math.max(1, rec.costScore);

        const rawScore = (rec.impactScore * rec.urgencyScore * rec.successProbability) / (complexity * costVal);
        const decisionScore = Math.round(rawScore * 10) / 10; // round to 1 decimal place

        // Categorize Priority automatically based on score thresholds
        let priority: ScoredRecommendation["priority"] = "low";
        if (decisionScore > 8.0) {
          priority = "critical";
        } else if (decisionScore > 4.5) {
          priority = "high";
        } else if (decisionScore > 2.0) {
          priority = "medium";
        }

        return {
          ...rec,
          decisionScore,
          priority,
        };
      })
      .sort((a, b) => b.decisionScore - a.decisionScore);
  }
}
