export const formatNumber = (n: number) =>
  !Number.isFinite(n)
    ? '0'
    : n >= 1e6
      ? `${+(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${+(n / 1e3).toFixed(1)}k`
        : n.toString()
