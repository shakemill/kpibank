import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

const EXT_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
}

function sanitizeBaseName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'preuve'
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
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
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error:
          'Format non autorisé. Utilisez PDF, image (PNG, JPEG, GIF, WebP), Word, Excel ou TXT/CSV.',
      },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max. 5 Mo)' }, { status: 400 })
  }

  const ext = EXT_BY_TYPE[file.type] ?? 'bin'
  const base = sanitizeBaseName(file.name)
  const token = randomBytes(6).toString('hex')
  const filename = `${Date.now()}-${token}-${base}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads', 'preuves', userId)
  const filepath = path.join(dir, filename)

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
  } catch (e) {
    console.error('[saisies/preuves]', e)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du fichier" },
      { status: 500 }
    )
  }

  const url = `/uploads/preuves/${userId}/${filename}`
  return NextResponse.json({ url, filename: file.name, size: file.size })
}
