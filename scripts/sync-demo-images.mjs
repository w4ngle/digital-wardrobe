import { mkdir, mkdtemp, rm, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase admin credentials are missing')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const output = join(process.cwd(), 'public', 'demo-items')
const temporary = await mkdtemp(join(tmpdir(), 'wardrobe-demo-'))
await mkdir(output, { recursive: true })

try {
  const { data: items, error } = await supabase.from('items').select('photo_url,ai_meta').order('created_at', { ascending: false })
  if (error) throw error
  const paths = [...new Set((items || [])
    .filter((item) => item.ai_meta?.demo === true && /^(demo|demo-core|demo-v2|demo-extra)\/[a-z0-9-]+\.png$/i.test(item.photo_url || ''))
    .map((item) => item.photo_url))]

  let downloaded = 0
  for (const path of paths) {
    const filename = basename(path).replace(/\.png$/i, '.webp')
    const destination = join(output, filename)
    try { await access(destination); continue } catch { /* download missing file */ }
    const { data, error: downloadError } = await supabase.storage.from('wardrobe-items').download(path)
    if (downloadError) throw downloadError
    const source = join(temporary, basename(path))
    await writeFile(source, Buffer.from(await data.arrayBuffer()))
    const converted = spawnSync('cwebp', ['-quiet', '-q', '82', source, '-o', destination], { stdio: 'inherit' })
    if (converted.status !== 0) throw new Error(`cwebp failed for ${path}`)
    downloaded++
  }
  console.log(`Downloaded ${downloaded} missing demo images; ${paths.length} images checked.`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
