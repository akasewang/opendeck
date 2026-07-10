import { cn } from '@/utils/cn'

type SpinningCircularTextProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  text: string
  charSpacing?: number
  fontSize?: string
  spinClassName?: string
}

export function SpinningCircularText({
  text,
  charSpacing = 1,
  fontSize = '1rem',
  spinClassName,
  className,
  style,
  ...props
}: SpinningCircularTextProps) {
  return (
    <div
      className={cn(
        'grid place-items-center font-mono font-medium uppercase select-none',
        className,
      )}
      style={
        {
          width: 'var(--sc-container-size)',
          height: 'var(--sc-container-size)',
          '--sc-size': fontSize,
          '--sc-char-count': text.length,
          '--sc-char-spacing': charSpacing,
          '--sc-inner-angle': 'calc((360 / var(--sc-char-count)) * 1deg)',
          '--sc-radius-factor': 'calc(var(--sc-char-spacing) / sin(var(--sc-inner-angle)))',
          '--sc-radius': 'calc(var(--sc-radius-factor) * -1ch)',
          '--sc-container-size': 'calc(var(--sc-radius-factor) * var(--sc-size) * 2)',
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        className={cn(
          'relative animate-[spin_10s_linear_infinite] leading-none',
          '*:absolute *:top-1/2 *:left-1/2 *:inline-block',
          '*:[--sc-char-rotate:calc(var(--sc-inner-angle)*var(--sc-char-index))]',
          '*:transform-[translate(-50%,-50%)_rotate(var(--sc-char-rotate))_translateY(var(--sc-radius))]',
          spinClassName,
        )}
        style={{ fontSize: 'var(--sc-size)' }}
        aria-hidden
      >
        {text.split('').map((char, index) => (
          <span key={index} style={{ '--sc-char-index': index } as React.CSSProperties}>
            {char}
          </span>
        ))}
      </div>
      <span className="sr-only">{text}</span>
    </div>
  )
}
