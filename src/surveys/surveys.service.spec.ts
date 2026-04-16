import { Test, TestingModule } from '@nestjs/testing';
import { SurveysService } from './surveys.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('SurveysService', () => {
  let service: SurveysService;

  const mockPrisma = {
    survey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    event: { findUnique: jest.fn() },
    question: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
    response: { findMany: jest.fn() },
    ponencia: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SurveysService>(SurveysService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getByEvent', () => {
    it('retorna null si el evento no tiene encuesta', async () => {
      mockPrisma.survey.findUnique.mockResolvedValue(null);
      const result = await service.getByEvent('ev-1');
      expect(result).toBeNull();
    });

    it('retorna la encuesta con preguntas ordenadas', async () => {
      const survey = { id: 'sv-1', questions: [{ orden: 2 }, { orden: 1 }] };
      mockPrisma.survey.findUnique.mockResolvedValue(survey);
      const result = await service.getByEvent('ev-1');
      expect(result).toEqual(survey);
    });
  });

  describe('createForEvent', () => {
    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.createForEvent('ev-no', { titulo: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el evento ya tiene encuesta', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.survey.findUnique.mockResolvedValue({ id: 'sv-existing' });
      await expect(service.createForEvent('ev-1', { titulo: 'X' })).rejects.toThrow(ConflictException);
    });

    it('crea la encuesta si el evento existe y no tiene encuesta', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.survey.findUnique.mockResolvedValue(null);
      mockPrisma.survey.create.mockResolvedValue({ id: 'sv-new', eventId: 'ev-1', titulo: 'Test' });

      const result = await service.createForEvent('ev-1', { titulo: 'Test' });

      expect(mockPrisma.survey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventId: 'ev-1', titulo: 'Test' }),
        }),
      );
      expect(result).toHaveProperty('id', 'sv-new');
    });
  });

  describe('addQuestion — validaciones por tipo', () => {
    const baseSurveyId = 'sv-1';
    const mockSurvey = { id: 'sv-1', eventId: 'ev-1', titulo: 'Test' };

    test.each([
      {
        dto: { tipo: 'OPCION_UNICA', texto: 'Elige', opciones: ['A'] },
        label: 'lanza BadRequestException si OPCION_UNICA tiene menos de 2 opciones',
        shouldThrow: true,
      },
      {
        dto: { tipo: 'MULTIPLE', texto: 'Elige varios', opciones: ['A', 'B'] },
        label: 'NO lanza error si MULTIPLE tiene 2+ opciones',
        shouldThrow: false,
      },
      {
        dto: { tipo: 'ESCALA', texto: 'Del 1 al 5', opciones: [] },
        label: 'lanza BadRequestException si ESCALA no tiene escalaMin/Max',
        shouldThrow: true,
      },
    ])('$label', async ({ dto, shouldThrow }) => {
      // El servicio primero busca la encuesta — hay que mockearla
      mockPrisma.survey.findUnique.mockResolvedValue(mockSurvey);
      mockPrisma.question.create.mockResolvedValue({ id: 'q-1', ...dto });

      const action = service.addQuestion(baseSurveyId, dto as any);

      if (shouldThrow) {
        await expect(action).rejects.toThrow(BadRequestException);
      } else {
        await expect(action).resolves.toBeDefined();
      }
    });

    it('lanza NotFoundException si la encuesta no existe', async () => {
      mockPrisma.survey.findUnique.mockResolvedValue(null);
      await expect(
        service.addQuestion('no-existe', { tipo: 'ABIERTA_CORTO', texto: 'X', opciones: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
