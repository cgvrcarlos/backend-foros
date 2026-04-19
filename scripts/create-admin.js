"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const SALT_ROUNDS = 12;
function prompt(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}
function promptPassword(question) {
    return new Promise(resolve => {
        process.stdout.write(question);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        let password = '';
        const handler = (char) => {
            if (char === '\r' || char === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', handler);
                process.stdout.write('\n');
                resolve(password);
            }
            else if (char === '\u0003') {
                process.exit();
            }
            else if (char === '\u007f') {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            }
            else {
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
    const prisma = new client_1.PrismaClient();
    try {
        const existing = await prisma.admin.findUnique({ where: { email } });
        if (existing) {
            console.error(`\n❌ Ya existe un admin con el email: ${email}`);
            process.exit(1);
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const admin = await prisma.admin.create({
            data: { email, password: hashedPassword, nombre, role: 'ADMIN' },
            select: { id: true, email: true, nombre: true, role: true },
        });
        console.log(`\n✅ Admin creado: ${admin.email} (id: ${admin.id})`);
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
//# sourceMappingURL=create-admin.js.map