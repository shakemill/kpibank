import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const MAX_SIZE = 2 * 1024 * 1024 // 2 Mo
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Données formulaire invalides' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non autorisé. Utilisez PNG, JPEG, GIF ou WebP.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (max. 2 Mo)' },
      { status: 400 }
    )
  }
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1] ?? 'png'
  const dir = path.join(process.cwd(), 'public', 'logos')
  const filename = `logo.${ext}`
  const filepath = path.join(dir, filename)
  try {
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)
  } catch (e) {
    console.error('[etablissement/logo]', e)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du fichier' },
      { status: 500 }
    )
  }
  const url = `/logos/${filename}`
  return NextResponse.json({ url })
}
