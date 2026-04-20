import { PrismaClient, Role, AdminLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = 'admin@eventpass.com';

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email} — skipping`);
    return;
  }

  const password = await bcrypt.hash('Admin1234!', SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email,
        password,
        nombre: 'Administrador',
      },
    });

    await tx.accountRole.create({
      data: { accountId: account.id, role: Role.ADMIN },
    });

    await tx.adminProfile.create({
      data: { accountId: account.id, nivel: AdminLevel.STANDARD },
    });
  });

  console.log(`Admin creado: ${email}`);
}

async function seedPonente() {
  const email = 'ponente@eventpass.com';

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ponente already exists: ${email} — skipping`);
    return;
  }

  const password = await bcrypt.hash('Ponente1234!', SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email,
        password,
        nombre: 'Ponente Demo',
      },
    });

    await tx.accountRole.create({
      data: { accountId: account.id, role: Role.PONENTE },
    });

    await tx.ponenteProfile.create({
      data: {
        accountId: account.id,
        bio: 'Ponente de demostración',
        especialidad: 'Tecnología',
      },
    });
  });

  console.log(`Ponente creado: ${email}`);
}

async function seedEvento() {
  const evento = await prisma.event.upsert({
    where: { id: 'evento-demo-01' },
    update: {},
    create: {
      id: 'evento-demo-01',
      titulo: 'Foro de Innovación Ciudadana 2026',
      descripcion:
        'Un espacio para discutir el futuro de la participación ciudadana en la era digital.',
      fechaHora: new Date('2026-05-15T10:00:00-06:00'),
      ubicacionPresencial: 'Auditorio Municipal, Planta Baja, Sala A',
      publicado: true,
    },
  });
  console.log('Evento creado:', evento.titulo);
  return evento;
}

async function seedPonencia(eventoId: string) {
  // The ponencia references the ponente Account — look it up first
  const ponenteAccount = await prisma.account.findUnique({
    where: { email: 'ponente@eventpass.com' },
  });

  if (!ponenteAccount) {
    console.log('Ponente account not found — skipping ponencia');
    return;
  }

  await prisma.ponencia.upsert({
    where: { id: 'ponencia-demo-01' },
    update: {},
    create: {
      id: 'ponencia-demo-01',
      ponenteId: ponenteAccount.id,
      eventoId,
      titulo: 'Participación Ciudadana en la Era Digital',
      lugar: 'Sala A - Auditorio Principal',
      horaInicio: new Date('1970-01-01T10:00:00Z'),
      horaFin: new Date('1970-01-01T11:30:00Z'),
      orden: 1,
    },
  });
  console.log('Ponencia creada');
}

async function seedEncuesta(eventId: string) {
  const survey = await prisma.survey.upsert({
    where: { eventId },
    update: {},
    create: {
      eventId,
      titulo: 'Encuesta del Foro de Innovación',
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        surveyId: survey.id,
        tipo: 'OPCION_UNICA',
        texto: '¿Cómo te enteraste de este evento?',
        opciones: ['Redes sociales', 'Correo electrónico', 'Un amigo', 'Otro'],
        esRequerida: true,
        seccion: 'ANALISIS',
        orden: 1,
      },
      {
        surveyId: survey.id,
        tipo: 'ESCALA',
        texto: '¿Qué tan relevante es el tema del foro para tu comunidad?',
        opciones: [],
        escalaMin: 1,
        escalaMax: 5,
        esRequerida: true,
        seccion: 'ANALISIS',
        orden: 2,
      },
      {
        surveyId: survey.id,
        tipo: 'ABIERTA_LARGO',
        texto:
          '¿Qué propuesta le harías a la ponente sobre participación ciudadana digital?',
        opciones: [],
        esRequerida: false,
        seccion: 'PROPUESTAS',
        orden: 3,
      },
    ],
  });
  console.log('Encuesta y preguntas creadas');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await seedAdmin();
  await seedPonente();

  const evento = await seedEvento();
  await seedPonencia(evento.id);
  await seedEncuesta(evento.id);

  console.log('\nSeed completado exitosamente');
  console.log('Admin:   admin@eventpass.com');
  console.log('Ponente: ponente@eventpass.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
