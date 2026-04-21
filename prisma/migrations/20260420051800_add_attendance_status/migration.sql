-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CONFIRMADO', 'ASISTIO', 'NO_ASISTIO');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'CONFIRMADO',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
