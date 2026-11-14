export async function removeImageBackground(file: File) {
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(file, { model: 'isnet_quint8', output: { format: 'image/png', quality: 0.9 } })
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-no-bg.png`, { type: 'image/png' })
}
