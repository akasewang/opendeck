import { readFileSync } from 'node:fs'
import { ImageResponse } from 'next/og'
import type { ReactElement } from 'react'
import { APP_CONFIG } from '@/config/app'

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = 'image/png'

const COLOR = {
  bg: '#0A0A0A',
  border: '#2B2B2B',
  primary: '#F5F5F5',
  faint: '#5C5C5C',
}

type FontWeight = 400 | 500 | 600 | 700

type LoadedFont = {
  name: string
  data: Buffer
  weight: FontWeight
  style: 'normal'
}

let fontCache: LoadedFont[] | null = null

function font(name: string, file: string, weight: FontWeight): LoadedFont {
  return {
    name,
    weight,
    style: 'normal',
    data: readFileSync(new URL(`./fonts/${file}`, import.meta.url)),
  }
}

function loadFonts(): LoadedFont[] {
  if (fontCache) return fontCache
  fontCache = [
    font('Badeen Display', 'BadeenDisplay-Regular.ttf', 400),
    font('Geist', 'Geist-Regular.ttf', 400),
    font('Geist Mono', 'GeistMono-Regular.ttf', 400),
  ]
  return fontCache
}

export function renderOgImage(element: ReactElement) {
  return new ImageResponse(element, { ...OG_SIZE, fonts: loadFonts() })
}

function Wordmark({ size, color = COLOR.primary }: { size: number; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'Badeen Display',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: 0,
        color,
      }}
    >
      OPENDECK
    </div>
  )
}

function PageNameOutline({ text }: { text: string }) {
  const pageName = text.toUpperCase()
  const fontSize = pageName.length > 12 ? 108 : pageName.length > 8 ? 120 : 142
  const strokeOffsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  const textStyle = {
    display: 'flex',
    fontFamily: 'Badeen Display',
    fontSize,
    lineHeight: 1,
    letterSpacing: 3,
    whiteSpace: 'nowrap',
  } as const

  return (
    <div
      style={{
        position: 'absolute',
        right: -18,
        bottom: -14,
        display: 'flex',
        width: 760,
        height: 150,
        justifyContent: 'flex-end',
      }}
    >
      {strokeOffsets.map(([x, y]) => (
        <div
          key={`${x}:${y}`}
          style={{
            ...textStyle,
            position: 'absolute',
            right: x,
            bottom: y,
            color: '#343434',
          }}
        >
          {pageName}
        </div>
      ))}
      <div
        style={{
          ...textStyle,
          position: 'absolute',
          right: 0,
          bottom: 0,
          color: COLOR.bg,
        }}
      >
        {pageName}
      </div>
    </div>
  )
}

export function BrandOg({
  pageName = 'home',
  description,
}: {
  pageName?: string
  description: string
}) {
  const descriptionText = description.replace(/\s+/g, ' ').trim()

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: COLOR.bg,
        overflow: 'hidden',
        padding: '54px 64px 52px',
      }}
    >
      <PageNameOutline text={pageName} />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 52,
          height: 1,
          display: 'flex',
          backgroundColor: COLOR.border,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          bottom: 80,
          width: 470,
          height: 1,
          display: 'flex',
          backgroundColor: '#F5F5F5',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Wordmark size={42} />
        <div
          style={{
            display: 'flex',
            fontFamily: 'Geist Mono',
            fontSize: 20,
            color: COLOR.faint,
          }}
        >
          {APP_CONFIG.domain}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            fontFamily: 'Geist',
            fontSize: 38,
            lineHeight: 1.35,
            color: COLOR.primary,
            maxWidth: 880,
            textWrap: 'pretty',
          }}
        >
          <div style={{ display: 'flex', textWrap: 'pretty' }}>{descriptionText}</div>
        </div>
      </div>
    </div>
  )
}
