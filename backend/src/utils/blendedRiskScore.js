export function calculateBlendedRisk(lines, approvalRules = []) {
  const totalValue = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0);
  const weightedOverLimit = lines.reduce((sum, line) => {
    const value = Number(line.quantity) * Number(line.unitPrice);
    const overLimit = Math.max(0, Number(line.discountPercent) - Number(line.allowedLimitPercent));
    return sum + (overLimit * value);
  }, 0);
  const score = totalValue ? Number((weightedOverLimit / totalValue).toFixed(2)) : 0;
  const rule = approvalRules.find(item => score >= Number(item.min_over_limit_points) && (item.max_over_limit_points === null || score <= Number(item.max_over_limit_points)));
  return { score, riskLabel: rule?.risk_label || (score > 0 ? 'MEDIUM' : 'LOW'), requiresManager: rule ? rule.requires_manager : score > 0, requiresFinance: rule?.requires_finance || false };
}