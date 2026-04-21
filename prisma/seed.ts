import { PrismaClient, Role, AdminLevel, Genero, GradoEstudios, SituacionLaboral } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

const ADMIN_EMAIL      = process.env.SEED_ADMIN_EMAIL      ?? 'admin@eventpass.com';
const ADMIN_PASSWORD   = process.env.SEED_ADMIN_PASSWORD   ?? 'Admin1234!';
const PONENTE_EMAIL    = process.env.SEED_PONENTE_EMAIL    ?? 'ponente@eventpass.com';
const PONENTE_PASSWORD  = process.env.SEED_PONENTE_PASSWORD  ?? 'Ponente1234!';
const STAFF_EMAIL       = process.env.SEED_STAFF_EMAIL       ?? 'staff@eventpass.com';
const STAFF_PASSWORD   = process.env.SEED_STAFF_PASSWORD   ?? 'Staff1234!';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = ADMIN_EMAIL;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email} — skipping`);
    return;
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

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
  const email = PONENTE_EMAIL;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ponente already exists: ${email} — skipping`);
    return;
  }

  const password = await bcrypt.hash(PONENTE_PASSWORD, SALT_ROUNDS);

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

async function seedStaff() {
  const email = STAFF_EMAIL;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Staff already exists: ${email} — skipping`);
    return;
  }

  const password = await bcrypt.hash(STAFF_PASSWORD, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email,
        password,
        nombre: 'Staff Demo',
      },
    });

    await tx.accountRole.create({
      data: { accountId: account.id, role: Role.STAFF },
    });
  });

  console.log(`Staff creado: ${email}`);
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
    where: { email: PONENTE_EMAIL },
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

  const preguntas = [
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
    ];

  // Crear preguntas una por una, verificando que no existan primero
  for (const pregunta of preguntas) {
    const existing = await prisma.question.findFirst({
      where: { surveyId: survey.id, texto: pregunta.texto },
    });
    if (!existing) {
      await prisma.question.create({ data: { surveyId: survey.id, ...pregunta } });
    }
  }
  console.log('Encuesta y preguntas creadas');
}

// ─── Usuarios de prueba para asistencia ────────────────────────────────────────

interface TestUser {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
}

const TEST_USERS: TestUser[] = [
  { email: 'juan@demo.com', password: 'Test1234!', nombre: 'Juan Pérez', telefono: '5512345678' },
  { email: 'maria@demo.com', password: 'Test1234!', nombre: 'María García', telefono: '5512345679' },
  { email: 'carlos@demo.com', password: 'Test1234!', nombre: 'Carlos López', telefono: '5512345680' },
  { email: 'ana@demo.com', password: 'Test1234!', nombre: 'Ana Martínez', telefono: '5512345681' },
  { email: 'luis@demo.com', password: 'Test1234!', nombre: 'Luis Rodríguez', telefono: '5512345682' },
  { email: 'sofia@demo.com', password: 'Test1234!', nombre: 'Sofia Hernández', telefono: '5512345683' },
  { email: 'pedro@demo.com', password: 'Test1234!', nombre: 'Pedro González', telefono: '5512345684' },
  { email: 'laura@demo.com', password: 'Test1234!', nombre: 'Laura López', telefono: '5512345685' },
];

async function seedTestUsers(eventId: string) {
  for (const user of TEST_USERS) {
    const existing = await prisma.account.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log(`Usuario ya existe: ${user.email} — skipping`);
      continue;
    }

    const password = await bcrypt.hash(user.password, SALT_ROUNDS);

    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          email: user.email,
          password,
          nombre: user.nombre,
          telefono: user.telefono,
        },
      });

      // Asignar rol ASISTENTE
      await tx.accountRole.create({
        data: { accountId: created.id, role: Role.ASISTENTE },
      });

      // Crear UserProfile con los datos demográficos
      await tx.userProfile.create({
        data: {
          accountId: created.id,
          apaterno: user.nombre.split(' ')[1] || 'Demo',
          amaterno: user.nombre.split(' ')[2] || 'Usuario',
          nombres: user.nombre,
          genero: Genero.MASCULINO,
          ocupacion: 'Estudiante',
          gradoEstudios: GradoEstudios.LICENCIATURA,
          situacionLaboral: SituacionLaboral.ESTUDIANTE,
        },
      });

      return created;
    });

    console.log(`Usuario creado: ${user.email} (ASISTENTE)`);
  }
}

async function seedAttendance(eventId: string) {
  // Estados de asistencia para variety
  const statuses = [
    { status: 'CONFIRMADO', hora: null },           // Pendiente
    { status: 'CONFIRMADO', hora: null },           // Pendiente
    { status: 'ASISTIO', hora: new Date('2026-05-15T10:15:00Z') },    // Asistió
    { status: 'ASISTIO', hora: new Date('2026-05-15T10:20:00Z') },    // Asistió
    { status: 'ASISTIO', hora: new Date('2026-05-15T10:25:00Z') },    // Asistió
    { status: 'NO_ASISTIO', hora: null },          // No asistió
    { status: 'NO_ASISTIO', hora: null },           // No asistió
    { status: 'NO_ASISTIO', hora: null },           // No asistió
  ];

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    const account = await prisma.account.findUnique({ where: { email: user.email } });
    if (!account) continue;

    const existing = await prisma.attendance.findFirst({
      where: { userId: account.id, eventId },
    });
    if (existing) {
      console.log(`Attendance ya existe para ${user.email} — skipping`);
      continue;
    }

    const { status, hora } = statuses[i];

    await prisma.attendance.create({
      data: {
        userId: account.id,
        eventId,
        status,
        tipoAsistencia: i % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL',
        qrCode: `QR-${account.id.slice(0, 8)}`,
        confirmedAt: new Date(),
        verifiedAt: hora,
      },
    });

    console.log(`Attendance creada: ${user.email} → ${status}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await seedAdmin();
  await seedPonente();
  await seedStaff();

  const evento = await seedEvento();
  await seedPonencia(evento.id);
  await seedEncuesta(evento.id);

  // Usuarios de prueba con rol ASISTENTE
  await seedTestUsers(evento.id);
  await seedAttendance(evento.id);

  console.log('\n=== Seed completado exitosamente ===');
  console.log(`Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Ponente: ${PONENTE_EMAIL} / ${PONENTE_PASSWORD}`);
  console.log(`Staff:  ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log(`       ${TEST_USERS.length} usuarios ASISTENTE creados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
