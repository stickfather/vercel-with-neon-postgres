/**
 * Shared utility functions for Finance report components
 */

export function getRiskColorClasses(daysOverdue: number, isDark: boolean = false): string {
  const isHighRisk = daysOverdue > 60;
  
  if (isDark) {
    return isHighRisk
      ? "bg-red-900/30 text-red-300 border-red-700/50"
      : "bg-amber-900/30 text-amber-300 border-amber-700/50";
  }
  
  return isHighRisk
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
}

export function getRiskTextColor(daysOverdue: number, isDark: boolean = false): string {
  const isHighRisk = daysOverdue > 60;
  
  if (isDark) {
    return isHighRisk ? "text-red-400" : "text-amber-400";
  }
  
  return isHighRisk ? "text-red-600" : "text-amber-600";
}
