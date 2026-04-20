import * as readline from 'readline';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function promptPassword(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';
    const handler = (char: string) => {
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', handler);
  });
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n=== Crear Administrador ===\n');

  const email = await prompt(rl, 'Email: ');
  const nombre = await prompt(rl, 'Nombre: ');
  rl.close();

  const password = await promptPassword('Contraseña (mín. 12 caracteres): ');
  const confirm = await promptPassword('Confirmar contraseña: ');

  if (password !== confirm) {
    console.error('\n❌ Las contraseñas no coinciden');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('\n❌ La contraseña debe tener al menos 12 caracteres');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      // Check if the account already has ADMIN role
      const hasAdmin = await prisma.accountRole.findUnique({
        where: { accountId_role: { accountId: existing.id, role: 'ADMIN' } },
      });
      if (hasAdmin) {
        console.error(`\n❌ Ya existe un admin con el email: ${email}`);
        process.exit(1);
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const account = await prisma.$transaction(async (tx) => {
      const acc = existing ?? await tx.account.create({
        data: { email, password: hashedPassword, nombre },
      });

      await tx.accountRole.create({
        data: { accountId: acc.id, role: 'ADMIN' },
      });

      await tx.adminProfile.create({
        data: { accountId: acc.id, nivel: 'STANDARD' },
      });

      return acc;
    });

    console.log(`\n✅ Admin creado: ${account.email} (id: ${account.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
