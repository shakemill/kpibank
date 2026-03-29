// Seed BGFI : Direction DSI + Direction commerciale
// pnpm run seed:bgfi
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const PASSWORD_HASH = bcrypt.hashSync('Donkem1000', 10)

async function main() {
  // 1. Etablissement
  let etab = await prisma.etablissement.findFirst()
  if (!etab) {
    etab = await prisma.etablissement.create({
      data: { nom: 'BGFI', actif: true },
    })
    console.log('Etablissement BGFI créé.')
  }

  // 2. DG
  let usrDg = await prisma.user.findFirst({ where: { role: 'DG' } })
  if (!usrDg) {
    usrDg = await prisma.user.create({
      data: {
        nom: 'Direction Générale',
        prenom: 'DG',
        email: 'dg@bgfi.com',
        password: PASSWORD_HASH,
        role: 'DG',
        actif: true,
        force_password_change: false,
      },
    })
    console.log('DG créé (dg@bgfi.com).')
  }

  // 3. Directions (idempotent by code)
  let dirDsi = await prisma.direction.findFirst({
    where: { code: 'DIR_DSI', etablissementId: etab.id },
  })
  if (!dirDsi) {
    dirDsi = await prisma.direction.create({
      data: {
        nom: "Direction des Systèmes d'Information",
        code: 'DIR_DSI',
        etablissementId: etab.id,
        actif: true,
      },
    })
    console.log('Direction DSI créée.')
  }

  let dirCom = await prisma.direction.findFirst({
    where: { code: 'DIR_COM', etablissementId: etab.id },
  })
  if (!dirCom) {
    dirCom = await prisma.direction.create({
      data: {
        nom: 'Direction commerciale',
        code: 'DIR_COM',
        etablissementId: etab.id,
        actif: true,
      },
    })
    console.log('Direction commerciale créée.')
  }

  // 4. Services DSI (idempotent by code)
  let srvCyber = await prisma.service.findFirst({
    where: { code: 'SRV_CYBER', directionId: dirDsi.id },
  })
  if (!srvCyber) {
    srvCyber = await prisma.service.create({
      data: {
        nom: 'Cybersécurité',
        code: 'SRV_CYBER',
        directionId: dirDsi.id,
        actif: true,
      },
    })
    console.log('Service Cybersécurité créé.')
  }

  let srvTransfo = await prisma.service.findFirst({
    where: { code: 'SRV_TRANSFO', directionId: dirDsi.id },
  })
  if (!srvTransfo) {
    srvTransfo = await prisma.service.create({
      data: {
        nom: 'Transformation digitale',
        code: 'SRV_TRANSFO',
        directionId: dirDsi.id,
        actif: true,
      },
    })
    console.log('Service Transformation digitale créé.')
  }

  // 5. Utilisateurs (ordre des dépendances)
  const usrSamira = await upsertUser({
    nom: 'Ebongue',
    prenom: 'Samira',
    email: 'samira.ebongue@bgfi.com',
    role: 'DIRECTEUR',
    directionId: dirDsi.id,
    serviceId: null,
    managerId: usrDg.id,
  })
  const usrPaulin = await upsertUser({
    nom: 'Kouam',
    prenom: 'Paulin',
    email: 'paulin.kouam@bgfi.com',
    role: 'DIRECTEUR',
    directionId: dirCom.id,
    serviceId: null,
    managerId: usrDg.id,
  })

  await prisma.direction.update({
    where: { id: dirDsi.id },
    data: { responsableId: usrSamira.id },
  })
  await prisma.direction.update({
    where: { id: dirCom.id },
    data: { responsableId: usrPaulin.id },
  })

  const usrPatricia = await upsertUser({
    nom: 'Kamdem',
    prenom: 'Patricia',
    email: 'patricia.kamdem@bgfi.com',
    role: 'EMPLOYE',
    directionId: dirDsi.id,
    serviceId: null,
    managerId: usrSamira.id,
  })

  const usrHamadou = await upsertUser({
    nom: 'Coulibaly',
    prenom: 'Hamadou',
    email: 'hamadou.coulibaly@bgfi.com',
    role: 'CHEF_SERVICE',
    directionId: null,
    serviceId: srvCyber.id,
    managerId: usrSamira.id,
  })
  const usrMonkam = await upsertUser({
    nom: 'Jules',
    prenom: 'Monkam',
    email: 'monkam.jules@bgfi.com',
    role: 'CHEF_SERVICE',
    directionId: null,
    serviceId: srvTransfo.id,
    managerId: usrSamira.id,
  })

  await prisma.service.update({
    where: { id: srvCyber.id },
    data: { responsableId: usrHamadou.id },
  })
  await prisma.service.update({
    where: { id: srvTransfo.id },
    data: { responsableId: usrMonkam.id },
  })

  await upsertUser({
    nom: 'Nyamoro',
    prenom: 'Pamele',
    email: 'pamele.nyamoro@bgfi.com',
    role: 'EMPLOYE',
    directionId: null,
    serviceId: srvCyber.id,
    managerId: usrHamadou.id,
  })
  await upsertUser({
    nom: 'Dikoum',
    prenom: 'Sonia',
    email: 'sonia.dikoum@bgfi.com',
    role: 'EMPLOYE',
    directionId: null,
    serviceId: srvTransfo.id,
    managerId: usrMonkam.id,
  })

  console.log('Seed BGFI DSI + Commercial terminé. Tous les comptes : mot de passe Donkem1000')
}

async function upsertUser(u: {
  nom: string
  prenom: string
  email: string
  role: 'DIRECTEUR' | 'CHEF_SERVICE' | 'EMPLOYE'
  directionId: number | null
  serviceId: number | null
  managerId: number
}) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } })
  if (existing) return existing
  return prisma.user.create({
    data: {
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      password: PASSWORD_HASH,
      role: u.role,
      directionId: u.directionId ?? undefined,
      serviceId: u.serviceId ?? undefined,
      managerId: u.managerId,
      actif: true,
      force_password_change: false,
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
