import modelExport from './logistic_export.json'
import metrics from './ml_metrics.json'

export type MlFeatures = Record<string, number>

export type MlPrediction = {
  probability: number
  label: 0 | 1
  model: string
  version: string
  horizon: number
  threshold: number
  metrics: Record<string, number | null>
  featureContributions: { feature: string; value: number; contribution: number }[]
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z)
    return 1 / (1 + ez)
  }
  const ez = Math.exp(z)
  return ez / (1 + ez)
}

export function predictLogistic(features: MlFeatures): MlPrediction | null {
  const cols: string[] = modelExport.feature_cols
  const mean: number[] = modelExport.mean
  const scale: number[] = modelExport.scale
  const coef: number[] = modelExport.coef
  const intercept: number = modelExport.intercept

  const x: number[] = []
  for (let i = 0; i < cols.length; i++) {
    const v = features[cols[i]]
    if (v === undefined || !Number.isFinite(v)) return null
    x.push((v - mean[i]) / (scale[i] || 1e-8))
  }

  let z = intercept
  const contributions: { feature: string; value: number; contribution: number }[] = []
  for (let i = 0; i < cols.length; i++) {
    const c = coef[i] * x[i]
    z += c
    contributions.push({ feature: cols[i], value: features[cols[i]], contribution: c })
  }
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  const probability = sigmoid(z)
  return {
    probability,
    label: probability >= 0.5 ? 1 : 0,
    model: modelExport.model,
    version: modelExport.version,
    horizon: modelExport.horizon,
    threshold: modelExport.threshold,
    metrics: modelExport.metrics as Record<string, number | null>,
    featureContributions: contributions.slice(0, 8),
  }
}

export function getModelMetrics() {
  return metrics
}
