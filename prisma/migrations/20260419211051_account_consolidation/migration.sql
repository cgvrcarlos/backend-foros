/*
  Warnings:

  - You are about to drop the column `respuesta` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ponente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `answer` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulo` to the `Ponencia` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `horaInicio` on the `Ponencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `horaFin` on the `Ponencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PONENTE', 'ASISTENTE');

-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('STANDARD', 'SUPER');

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ponencia" DROP CONSTRAINT "Ponencia_ponenteId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_userId_fkey";

-- AlterTable (rename column to preserve data)
ALTER TABLE "Answer" RENAME COLUMN "respuesta" TO "answer";

-- AlterTable Ponencia: add titulo with temp default, cast time columns
ALTER TABLE "Ponencia"
  ADD COLUMN "descripcion" TEXT,
  ADD COLUMN "titulo" TEXT NOT NULL DEFAULT 'Sin título';

ALTER TABLE "Ponencia" ALTER COLUMN "titulo" DROP DEFAULT;

ALTER TABLE "Ponencia"
  ALTER COLUMN "horaInicio" TYPE TIME(0) USING "horaInicio"::time(0),
  ALTER COLUMN "horaFin" TYPE TIME(0) USING "horaFin"::time(0);

-- Clean up seed data that cannot be migrated (dev environment, pre-release)
-- Order matters: delete children before parents
DELETE FROM "Answer";
DELETE FROM "Response";
DELETE FROM "Attendance";
DELETE FROM "Ponencia";

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Ponente";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "AdminRole";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "nombre" TEXT NOT NULL,
    "apaterno" TEXT,
    "amaterno" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRole" (
    "accountId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRole_pkey" PRIMARY KEY ("accountId","role")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "accountId" TEXT NOT NULL,
    "apaterno" TEXT NOT NULL,
    "amaterno" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "ocupacion" TEXT NOT NULL,
    "gradoEstudios" "GradoEstudios" NOT NULL,
    "escuela" TEXT,
    "situacionLaboral" "SituacionLaboral" NOT NULL,
    "direccion" JSONB,
    "redesSociales" JSONB,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "PonenteProfile" (
    "accountId" TEXT NOT NULL,
    "bio" TEXT,
    "especialidad" TEXT,
    "fotoUrl" TEXT,
    "redesSociales" JSONB,

    CONSTRAINT "PonenteProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "accountId" TEXT NOT NULL,
    "nivel" "AdminLevel" NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Account_email_idx" ON "Account"("email");

-- CreateIndex
CREATE INDEX "AccountRole_role_idx" ON "AccountRole"("role");

-- CreateIndex
CREATE INDEX "AccountRole_accountId_idx" ON "AccountRole"("accountId");

-- CreateIndex
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");

-- CreateIndex
CREATE INDEX "Ponencia_ponenteId_idx" ON "Ponencia"("ponenteId");

-- CreateIndex
CREATE INDEX "Response_userId_idx" ON "Response"("userId");

-- AddForeignKey
ALTER TABLE "AccountRole" ADD CONSTRAINT "AccountRole_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PonenteProfile" ADD CONSTRAINT "PonenteProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ponencia" ADD CONSTRAINT "Ponencia_ponenteId_fkey" FOREIGN KEY ("ponenteId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
