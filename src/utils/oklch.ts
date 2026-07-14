const srgbToLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const linearToSrgb = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

export type Oklch = { l: number; c: number; h: number }

export const hexToOklch = (hex: string): Oklch => {
  const red = srgbToLinear(Number.parseInt(hex.slice(1, 3), 16) / 255)
  const green = srgbToLinear(Number.parseInt(hex.slice(3, 5), 16) / 255)
  const blue = srgbToLinear(Number.parseInt(hex.slice(5, 7), 16) / 255)

  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

  const l = 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short
  const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short
  const b = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short

  return {
    l,
    c: Math.hypot(a, b),
    h: (Math.atan2(b, a) * (180 / Math.PI) + 360) % 360,
  }
}

const isWithinSrgb = (l: number, c: number, h: number) => {
  const radians = h * (Math.PI / 180)
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)

  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  const red = 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short
  const green = -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short
  const blue = -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short

  return [red, green, blue].every((channel) => {
    const encoded = linearToSrgb(channel)
    return encoded >= -0.001 && encoded <= 1.001
  })
}

export const maxSrgbChroma = (l: number, h: number) => {
  let low = 0
  let high = 0.4

  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2
    if (isWithinSrgb(l, mid, h)) low = mid
    else high = mid
  }

  return low
}
