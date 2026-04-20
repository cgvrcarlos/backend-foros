import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionType } from '@prisma/client';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async getByEvent(eventId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { eventId },
      include: {
        questions: {
          orderBy: { orden: 'asc' },
        },
      },
    });

    return survey ?? null;
  }

  async createForEvent(eventId: string, dto: CreateSurveyDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Evento ${eventId} no encontrado`);
    }

    const existing = await this.prisma.survey.findUnique({
      where: { eventId },
    });

    if (existing) {
      throw new ConflictException('Este evento ya tiene una encuesta asociada');
    }

    return this.prisma.survey.create({
      data: {
        eventId,
        titulo: dto.titulo ?? 'Encuesta de satisfacción',
      },
      include: {
        questions: true,
      },
    });
  }

  async updateForEvent(eventId: string, dto: CreateSurveyDto) {
    const survey = await this.prisma.survey.findUnique({
      where: { eventId },
    });

    if (!survey) {
      throw new NotFoundException('No existe encuesta para este evento');
    }

    return this.prisma.survey.update({
      where: { eventId },
      data: { titulo: dto.titulo },
      include: {
        questions: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  async addQuestion(surveyId: string, dto: CreateQuestionDto) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Encuesta ${surveyId} no encontrada`);
    }

    if (
      dto.tipo === QuestionType.OPCION_UNICA ||
      dto.tipo === QuestionType.MULTIPLE
    ) {
      if (!dto.opciones || dto.opciones.length < 2) {
        throw new BadRequestException(
          'Las preguntas de opción única o múltiple deben tener al menos 2 opciones',
        );
      }
    }

    if (dto.tipo === QuestionType.ESCALA) {
      if (dto.escalaMin === undefined || dto.escalaMax === undefined) {
        throw new BadRequestException(
          'Las preguntas de escala requieren escalaMin y escalaMax',
        );
      }
    }

    return this.prisma.question.create({
      data: {
        surveyId,
        tipo: dto.tipo,
        texto: dto.texto,
        opciones: dto.opciones ?? [],
        escalaMin: dto.escalaMin,
        escalaMax: dto.escalaMax,
        esRequerida: dto.esRequerida ?? false,
        seccion: dto.seccion ?? 'ANALISIS',
        orden: dto.orden ?? 0,
      },
    });
  }

  async updateQuestion(questionId: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${questionId} no encontrada`);
    }

    const tipoFinal = dto.tipo ?? question.tipo;

    if (
      tipoFinal === QuestionType.OPCION_UNICA ||
      tipoFinal === QuestionType.MULTIPLE
    ) {
      const opcionesFinal = dto.opciones ?? question.opciones;
      if (!opcionesFinal || opcionesFinal.length < 2) {
        throw new BadRequestException(
          'Las preguntas de opción única o múltiple deben tener al menos 2 opciones',
        );
      }
    }

    if (tipoFinal === QuestionType.ESCALA) {
      const minFinal = dto.escalaMin ?? question.escalaMin;
      const maxFinal = dto.escalaMax ?? question.escalaMax;
      if (minFinal === undefined || minFinal === null || maxFinal === undefined || maxFinal === null) {
        throw new BadRequestException(
          'Las preguntas de escala requieren escalaMin y escalaMax',
        );
      }
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.texto !== undefined && { texto: dto.texto }),
        ...(dto.opciones !== undefined && { opciones: dto.opciones }),
        ...(dto.escalaMin !== undefined && { escalaMin: dto.escalaMin }),
        ...(dto.escalaMax !== undefined && { escalaMax: dto.escalaMax }),
        ...(dto.esRequerida !== undefined && { esRequerida: dto.esRequerida }),
        ...(dto.seccion !== undefined && { seccion: dto.seccion }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
      },
    });
  }

  async removeQuestion(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${questionId} no encontrada`);
    }

    await this.prisma.question.delete({ where: { id: questionId } });
  }

async getResponses(surveyId: string, roles: string[], userId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { event: true },
    });

    if (!survey) {
      throw new NotFoundException(`Encuesta ${surveyId} no encontrada`);
    }

    if (roles.includes('PONENTE')) {
      const pon = await this.prisma.ponencia.findFirst({
        where: {
          eventoId: survey.eventId,
          ponenteId: userId,
        },
      });

      if (!pon) {
        throw new ForbiddenException(
          'No tenés ponencia en el evento de esta encuesta',
        );
      }
    }

    return this.prisma.response.findMany({
      where: { surveyId },
      include: {
        account: {
          select: {
            email: true,
            nombre: true,
            userProfile: {
              select: {
                apaterno: true,
                amaterno: true,
                nombres: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: { texto: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
