// Seed de prueba para asistencia - ejecutar con: node prisma/seed-demo.js
// Requiere: DATABASE_URL en .env

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const bcrypt = require('bcryptjs');

function generateQRCode() {
  return crypto.randomUUID();
}

const TEST_USERS = [
  { email: 'juan@demo.com', password: 'Test1234!', nombres: 'Juan Pérez', apaterno: 'Pérez', amaterno: 'García', telefono: '5512345678' },
  { email: 'maria@demo.com', password: 'Test1234!', nombres: 'María García', apaterno: 'García', amaterno: 'López', telefono: '5512345679' },
  { email: 'carlos@demo.com', password: 'Test1234!', nombres: 'Carlos López', apaterno: 'López', amaterno: 'Martínez', telefono: '5512345680' },
  { email: 'ana@demo.com', password: 'Test1234!', nombres: 'Ana Martínez', apaterno: 'Martínez', amaterno: 'Rodríguez', telefono: '5512345681' },
  { email: 'luis@demo.com', password: 'Test1234!', nombres: 'Luis Rodríguez', apaterno: 'Rodríguez', amaterno: 'Hernández', telefono: '5512345682' },
  { email: 'sofia@demo.com', password: 'Test1234!', nombres: 'Sofia Hernández', apaterno: 'Hernández', amaterno: 'González', telefono: '5512345683' },
  { email: 'pedro@demo.com', password: 'Test1234!', nombres: 'Pedro González', apaterno: 'González', amaterno: 'Pérez', telefono: '5512345684' },
  { email: 'laura@demo.com', password: 'Test1234!', nombres: 'Laura Pérez', apaterno: 'Pérez', amaterno: 'García', telefono: '5512345685' },
];

const statuses = [
  { status: 'CONFIRMADO', attended: null, hora: null },
  { status: 'CONFIRMADO', attended: null, hora: null },
  { status: 'ASISTIO', attended: true, hora: new Date('2026-05-15T10:15:00Z') },
  { status: 'ASISTIO', attended: true, hora: new Date('2026-05-15T10:20:00Z') },
  { status: 'ASISTIO', attended: true, hora: new Date('2026-05-15T10:25:00Z') },
  { status: 'NO_ASISTIO', attended: false, hora: null },
  { status: 'NO_ASISTIO', attended: false, hora: null },
  { status: 'NO_ASISTIO', attended: false, hora: null },
];

async function main() {
  const eventId = 'evento-demo-01';

  console.log('=== Seed de usuarios de prueba ===\n');

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    const existing = await prisma.account.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log('Ya existe:', user.email);
      continue;
    }

    const password = await bcrypt.hash(user.password, 10);
    
    const account = await prisma.account.create({
      data: {
        email: user.email,
        password,
        nombre: user.nombres,
        apaterno: user.apaterno,
        amaterno: user.amaterno,
        telefono: user.telefono,
        // User profile fields
        userProfile: {
          create: {
            nombres: user.nombres,
            apaterno: user.apaterno,
            amaterno: user.amaterno,
            genero: 'MASCULINO',
            ocupacion: 'Estudiante',
            gradoEstudios: 'LICENCIATURA',
            situacionLaboral: 'ESTUDIANTE',
          }
        }
      },
    });

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: { accountId: account.id, eventId },
    });
    if (existingAttendance) {
      console.log('Attendance ya existe:', user.email);
      continue;
    }

    const { status, attended, hora } = statuses[i];
    await prisma.attendance.create({
      data: {
        accountId: account.id,
        eventId,
        qrCode: generateQRCode(),
        status,
        tipoAsistencia: i % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL',
        confirmedAt: new Date(),
        verifiedAt: hora,
        attended,
      },
    });

    console.log('✓', user.email, '→', status, '(' + (i % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL') + ')');
  }

  console.log('\n=== Resumen ===');
  console.log('2 pendientes (CONFIRMADO)');
  console.log('3 asistió (ASISTIO)');
  console.log('3 no asistió (NO_ASISTIO)');
  console.log('\nPara probar:');
  console.log('- Login admin: admin@eventpass.com / Admin1234!');
  console.log('- Ver stats: GET /api/stats/event/evento-demo-01');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());