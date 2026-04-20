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

  async getByEvent(eventId: string, roles: string[], userId: string) {
    // Si PONENTE: verificar que tiene poesia en ese evento
    if (roles.includes('PONENTE')) {
      const pon = await this.prisma.ponencia.findFirst({
        where: {
          eventoId: eventId,
          ponenteId: userId,
        },
      });

      if (!pon) {
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
        account: {
          select: {
            nombre: true,
            email: true,
            telefono: true,
            userProfile: {
              select: {
                nombres: true,
                apaterno: true,
                amaterno: true,
              },
            },
          },
        },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    // Flatten for backward compatibility: controllers expect { nombres, apaterno, amaterno, email, telefono }
    return attendances.map((att) => ({
      id: att.id,
      tipoAsistencia: att.tipoAsistencia,
      confirmedAt: att.confirmedAt,
      qrCode: att.qrCode,
      user: {
        nombres: att.account?.userProfile?.nombres ?? att.account?.nombre ?? null,
        apaterno: att.account?.userProfile?.apaterno ?? null,
        amaterno: att.account?.userProfile?.amaterno ?? null,
        email: att.account?.email ?? null,
        telefono: att.account?.telefono ?? null,
      },
    }));
  }

  async getQr(attendanceId: string, userId: string, roles: string[]) {
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

    // El ASISTENTE solo puede ver su propio QR
    if (roles.includes('ASISTENTE') && attendance.userId !== userId) {
      throw new ForbiddenException('No tenés permiso para ver este QR');
    }

    return { qrCode: attendance.qrCode };
  }
}
