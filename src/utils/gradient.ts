export function generateGradientFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)

  const random = (seedOffset: number) => {
    const x = Math.sin(hash + seedOffset) * 10000
    return x - Math.floor(x)
  }

  const getColor = (offset: number) =>
    `hsl(${Math.floor(random(offset) * 360)}, ${Math.floor(random(offset + 1) * 30 + 70)}%, ${Math.floor(random(offset + 2) * 15 + 75)}%)`

  return {
    colors: [getColor(10), getColor(20)] as const,
    angle: Math.floor(random(50) * 360),
  }
}
