-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO', 'NO_DICE');

-- CreateEnum
CREATE TYPE "GradoEstudios" AS ENUM ('PRIMARIA', 'SECUNDARIA', 'PREPARATORIA', 'LICENCIATURA', 'POSGRADO', 'OTRO');

-- CreateEnum
CREATE TYPE "SituacionLaboral" AS ENUM ('ESTUDIANTE', 'EMPLEADO', 'AUTOEMPLEADO', 'DESEMPLEADO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoAsistencia" AS ENUM ('PRESENCIAL', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('OPCION_UNICA', 'MULTIPLE', 'ESCALA', 'ABIERTA_CORTO', 'ABIERTA_LARGO');

-- CreateEnum
CREATE TYPE "Seccion" AS ENUM ('ANALISIS', 'PROPUESTAS');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'PONENTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "apaterno" TEXT NOT NULL,
    "amaterno" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "telefono" TEXT NOT NULL,
    "redesSociales" TEXT,
    "calle" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "cp" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "ocupacion" TEXT NOT NULL,
    "gradoEstudios" "GradoEstudios" NOT NULL,
    "escuela" TEXT,
    "situacionLaboral" "SituacionLaboral" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ponente" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ponente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ponencia" (
    "id" TEXT NOT NULL,
    "ponenteId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ponencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "linkVirtual" TEXT,
    "ubicacionPresencial" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Encuesta de satisfacción',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "tipo" "QuestionType" NOT NULL,
    "texto" TEXT NOT NULL,
    "opciones" TEXT[],
    "escalaMin" INTEGER,
    "escalaMax" INTEGER,
    "esRequerida" BOOLEAN NOT NULL DEFAULT false,
    "seccion" "Seccion" NOT NULL DEFAULT 'ANALISIS',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tipoAsistencia" "TipoAsistencia" NOT NULL DEFAULT 'PRESENCIAL',
    "qrCode" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "respuesta" JSONB NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ponente_email_key" ON "Ponente"("email");
CREATE INDEX "Ponente_email_idx" ON "Ponente"("email");

-- CreateIndex
CREATE INDEX "Ponencia_eventoId_idx" ON "Ponencia"("eventoId");

-- CreateIndex
CREATE INDEX "Event_publicado_eliminado_idx" ON "Event"("publicado", "eliminado");
CREATE INDEX "Event_fechaHora_idx" ON "Event"("fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_eventId_key" ON "Survey"("eventId");

-- CreateIndex
CREATE INDEX "Question_surveyId_orden_idx" ON "Question"("surveyId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_qrCode_key" ON "Attendance"("qrCode");
CREATE UNIQUE INDEX "Attendance_userId_eventId_key" ON "Attendance"("userId", "eventId");
CREATE INDEX "Attendance_eventId_confirmedAt_idx" ON "Attendance"("eventId", "confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Response_attendanceId_key" ON "Response"("attendanceId");
CREATE INDEX "Response_surveyId_submittedAt_idx" ON "Response"("surveyId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");

-- AddForeignKey
ALTER TABLE "Ponencia" ADD CONSTRAINT "Ponencia_ponenteId_fkey" FOREIGN KEY ("ponenteId") REFERENCES "Ponente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ponencia" ADD CONSTRAINT "Ponencia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Survey" ADD CONSTRAINT "Survey_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Question" ADD CONSTRAINT "Question_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Response" ADD CONSTRAINT "Response_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Response" ADD CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Answer" ADD CONSTRAINT "Answer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
