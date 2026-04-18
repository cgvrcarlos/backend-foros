import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmAttendanceDto } from './dto/confirm-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async confirm(userId: string, dto: ConfirmAttendanceDto) {
    // 1. Verificar que el evento existe, está publicado y no eliminado
    const event = await this.prisma.event.findFirst({
      where: {
        id: dto.eventId,
        publicado: true,
        eliminado: false,
      },
      include: {
        survey: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento con id "${dto.eventId}" no encontrado`);
    }

    // 2. Verificar que el usuario no confirmó ya
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: dto.eventId,
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Ya confirmaste asistencia a este evento');
    }

    // 3. Generar qrCode
    const qrCode = crypto.randomUUID();

    // 4. Crear Attendance
    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        eventId: dto.eventId,
        tipoAsistencia: dto.tipoAsistencia,
        qrCode,
      },
    });

    // 5. Si el evento tiene encuesta Y se enviaron answers
    if (event.survey && dto.answers && dto.answers.length > 0) {
      const survey = event.survey;
      const requiredQuestions = survey.questions.filter((q) => q.esRequerida);

      // Validar preguntas requeridas
      for (const rq of requiredQuestions) {
        const answered = dto.answers.find((a) => a.questionId === rq.id);
        if (!answered || answered.answer === null || answered.answer === undefined) {
          throw new BadRequestException(
            `La pregunta requerida "${rq.texto}" no tiene respuesta`,
          );
        }
      }

      // Crear Response
      const response = await this.prisma.response.create({
        data: {
          attendanceId: attendance.id,
          surveyId: survey.id,
          userId,
        },
      });

      // Crear Answers
      await this.prisma.answer.createMany({
        data: dto.answers.map((a) => ({
          responseId: response.id,
          questionId: a.questionId,
          answer: a.answer,
        })),
        skipDuplicates: true,
      });
    }

    return { attendance, qrCode };
  }

  async getByEvent(eventId: string, role: string, userId: string) {
    // Si PONENTE: verificar que tiene ponencia en ese evento
    if (role === 'PONENTE') {
      const ponencia = await this.prisma.ponencia.findFirst({
        where: {
          eventoId: eventId,
          ponenteId: userId,
        },
      });

      if (!ponencia) {
        throw new ForbiddenException(
          'No tenés una ponencia asignada en este evento',
        );
      }
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { eventId },
      select: {
        id: true,
        tipoAsistencia: true,
        confirmedAt: true,
        qrCode: true,
        user: {
          select: {
            nombres: true,
            apaterno: true,
            amaterno: true,
            email: true,
            telefono: true,
          },
        },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    return attendances;
  }

  async getQr(attendanceId: string, userId: string, role: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true,
        qrCode: true,
        userId: true,
        eventId: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance con id "${attendanceId}" no encontrado`);
    }

    // El USER solo puede ver su propio QR
    if (role === 'USER' && attendance.userId !== userId) {
      throw new ForbiddenException('No tenés permiso para ver este QR');
    }

    return { qrCode: attendance.qrCode };
  }
}
