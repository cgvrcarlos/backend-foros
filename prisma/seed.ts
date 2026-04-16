import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = 12;

  // Admin
  const adminPassword = await bcrypt.hash('Admin1234!', SALT_ROUNDS);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@eventpass.com' },
    update: {},
    create: {
      email: 'admin@eventpass.com',
      password: adminPassword,
      nombre: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log('Admin creado:', admin.email);

  // Ponente de ejemplo
  const ponentePassword = await bcrypt.hash('Ponente1234!', SALT_ROUNDS);
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
  console.log('Admin:   admin@eventpass.com / Admin1234!');
  console.log('Ponente: ponente@eventpass.com / Ponente1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
