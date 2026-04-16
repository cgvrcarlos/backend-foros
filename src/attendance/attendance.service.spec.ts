import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockPrisma = {
    event: { findFirst: jest.fn() },
    attendance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    ponencia: { findFirst: jest.fn() },
    response: { create: jest.fn() },
    answer: { createMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('confirm', () => {
    const dto = { eventId: 'ev-1', tipoAsistencia: 'PRESENCIAL' as const, answers: [] };

    it('lanza NotFoundException si el evento no existe o no está publicado', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);
      await expect(service.confirm('user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el usuario ya confirmó', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1', survey: null });
      mockPrisma.attendance.findUnique.mockResolvedValue({ id: 'att-1' });
      await expect(service.confirm('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('crea attendance con QR único cuando todo es válido', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1', survey: null });
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      mockPrisma.attendance.create.mockResolvedValue({ id: 'att-new', qrCode: 'uuid-fake' });

      const result = await service.confirm('user-1', dto);

      expect(mockPrisma.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            eventId: 'ev-1',
            tipoAsistencia: 'PRESENCIAL',
          }),
        }),
      );
      expect(result).toHaveProperty('qrCode');
    });

    it('lanza BadRequestException si una pregunta requerida no tiene respuesta', async () => {
      const eventWithSurvey = {
        id: 'ev-1',
        survey: {
          id: 'sv-1',
          questions: [{ id: 'q-1', texto: '¿Pregunta?', esRequerida: true }],
        },
      };
      mockPrisma.event.findFirst.mockResolvedValue(eventWithSurvey);
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      mockPrisma.attendance.create.mockResolvedValue({ id: 'att-new', qrCode: 'uuid' });

      // answers vacías pero hay una pregunta requerida
      const dtoSinAnswers = { ...dto, answers: [] };
      // La validación ocurre solo si answers.length > 0 Y hay survey
      // Aquí enviamos 1 answer vacía para disparar la validación
      const dtoConAnswerVacia = {
        ...dto,
        answers: [{ questionId: 'q-otra', respuesta: 'algo' }],
      };

      await expect(service.confirm('user-1', dtoConAnswerVacia)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getQr', () => {
    it('lanza NotFoundException si el attendance no existe', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      await expect(service.getQr('att-1', 'user-1', 'USER')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si USER intenta ver el QR de otro', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        qrCode: 'qr-code',
        userId: 'otro-user',
        eventId: 'ev-1',
      });
      await expect(service.getQr('att-1', 'user-1', 'USER')).rejects.toThrow(ForbiddenException);
    });

    it('retorna el QR al propietario', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        qrCode: 'mi-qr',
        userId: 'user-1',
        eventId: 'ev-1',
      });
      const result = await service.getQr('att-1', 'user-1', 'USER');
      expect(result).toEqual({ qrCode: 'mi-qr' });
    });
  });

  describe('getByEvent', () => {
    it('lanza ForbiddenException si el PONENTE no tiene ponencia en el evento', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue(null);
      await expect(service.getByEvent('ev-1', 'PONENTE', 'ponente-1')).rejects.toThrow(ForbiddenException);
    });

    it('el ADMIN puede ver asistencias sin verificar ponencia', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      const result = await service.getByEvent('ev-1', 'ADMIN', 'admin-1');
      expect(mockPrisma.ponencia.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
