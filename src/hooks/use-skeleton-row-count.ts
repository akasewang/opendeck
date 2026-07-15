'use client'

import { useLayoutEffect, useState } from 'react'

const TABLE_SKELETON_ROW_HEIGHT_PX = 49

export function useSkeletonRowCount({
  node,
  rowHeight = TABLE_SKELETON_ROW_HEIGHT_PX,
  minimum = 10,
}: {
  node: HTMLElement | null
  rowHeight?: number
  minimum?: number
}) {
  const [rowCount, setRowCount] = useState(minimum)

  useLayoutEffect(() => {
    if (!node) return
    const update = () => setRowCount(Math.max(minimum, Math.ceil(node.clientHeight / rowHeight)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [minimum, node, rowHeight])

  return rowCount
}
