import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  try {
    await prisma.direction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const prismaError = e as { code?: string }
    if (prismaError?.code === 'P2003' || (e instanceof Error && e.message?.includes('Foreign key'))) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer cette direction : des données lui sont rattachées. Désactivez-la à la place.',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
