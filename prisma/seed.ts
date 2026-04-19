import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno requerida: ${name}`);
  return value;
}

async function main() {
  const SALT_ROUNDS = 12;

  // Admin — credenciales desde variables de entorno
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@eventpass.com';
  const adminPassword = await bcrypt.hash(requireEnv('ADMIN_PASSWORD'), SALT_ROUNDS);
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      nombre: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log('Admin creado:', admin.email);

  // Ponente de ejemplo
  const ponentePassword = await bcrypt.hash(process.env.PONENTE_PASSWORD ?? 'Ponente1234!', SALT_ROUNDS);
  const ponente = await prisma.ponente.upsert({
    where: { email: 'ponente@eventpass.com' },
    update: {},
    create: {
      email: 'ponente@eventpass.com',
      password: ponentePassword,
      nombre: 'María González',
      bio: 'Experta en tecnología cívica y participación ciudadana.',
    },
  });
  console.log('Ponente creado:', ponente.email);

  // Evento de ejemplo
  const evento = await prisma.event.upsert({
    where: { id: 'evento-demo-01' },
    update: {},
    create: {
      id: 'evento-demo-01',
      titulo: 'Foro de Innovación Ciudadana 2026',
      descripcion: 'Un espacio para discutir el futuro de la participación ciudadana en la era digital.',
      fechaHora: new Date('2026-05-15T10:00:00-06:00'),
      ubicacionPresencial: 'Auditorio Municipal, Planta Baja, Sala A',
      publicado: true,
    },
  });
  console.log('Evento creado:', evento.titulo);

  // Ponencia
  await prisma.ponencia.upsert({
    where: { id: 'ponencia-demo-01' },
    update: {},
    create: {
      id: 'ponencia-demo-01',
      ponenteId: ponente.id,
      eventoId: evento.id,
      lugar: 'Sala A - Auditorio Principal',
      horaInicio: '10:00',
      horaFin: '11:30',
      orden: 1,
    },
  });
  console.log('Ponencia creada');

  // Encuesta del evento
  const survey = await prisma.survey.upsert({
    where: { eventId: evento.id },
    update: {},
    create: {
      eventId: evento.id,
      titulo: 'Encuesta del Foro de Innovación',
    },
  });

  // Preguntas
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
        texto: '¿Qué propuesta le harías a la ponente sobre participación ciudadana digital?',
        opciones: [],
        esRequerida: false,
        seccion: 'PROPUESTAS',
        orden: 3,
      },
    ],
  });
  console.log('Encuesta y preguntas creadas');

  console.log('\n✅ Seed completado exitosamente');
  console.log(`Admin:   ${adminEmail}`);
  console.log(`Ponente: ponente@eventpass.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
