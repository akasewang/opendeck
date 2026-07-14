export function restoreListItem<T>(list: T[], index: number, item: T) {
  const next = [...list]
  next.splice(index, 0, item)
  return next
}
