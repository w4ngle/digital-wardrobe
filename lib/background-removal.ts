export async function removeImageBackground(file: File, onProgress?: (progress: number) => void) {
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(file, {
    model: 'small',
    output: { format: 'image/png', quality: 0.9 },
    progress: (_key: string, current: number, total: number) => { onProgress?.(total ? current / total : 0) },
  })
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-no-bg.png`, { type: 'image/png' })
}
