import { ImgHTMLAttributes } from 'react'

type FastImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & { alt: string }

export default function FastImage(props: FastImageProps) {
  const { alt, ...imageProps } = props
  // Native lazy loading works with temporary signed Supabase URLs without extra image-proxy requests.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading="lazy" decoding="async" {...imageProps} />
}
