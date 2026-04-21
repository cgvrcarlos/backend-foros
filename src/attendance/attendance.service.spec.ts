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
      update: jest.fn(),
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
        answers: [{ questionId: 'q-otra', answer: 'algo' }],
      };

      await expect(service.confirm('user-1', dtoConAnswerVacia)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getQr', () => {
    it('lanza NotFoundException si el attendance no existe', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      await expect(service.getQr('att-1', 'user-1', ['ASISTENTE'])).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si ASISTENTE intenta ver el QR de otro', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        qrCode: 'qr-code',
        userId: 'otro-user',
        eventId: 'ev-1',
      });
      await expect(service.getQr('att-1', 'user-1', ['ASISTENTE'])).rejects.toThrow(ForbiddenException);
    });

    it('retorna el QR al propietario', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        qrCode: 'mi-qr',
        userId: 'user-1',
        eventId: 'ev-1',
      });
      const result = await service.getQr('att-1', 'user-1', ['ASISTENTE']);
      expect(result).toEqual({ qrCode: 'mi-qr' });
    });
  });

  describe('verify', () => {
    const dto = { qrCode: 'qr-abc', eventId: 'ev-1', attended: true };
    const baseAttendance = { id: 'att-1', eventId: 'ev-1', status: 'CONFIRMADO', account: { nombre: 'Juan', email: 'juan@test.com' } };

    it('registra asistencia cuando QR es válido y pertenece al evento', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(baseAttendance);
      mockPrisma.attendance.update.mockResolvedValue({ ...baseAttendance, status: 'ASISTIO', verifiedAt: new Date() });

      const result = await service.verify(dto, 'verifier-1');

      expect(mockPrisma.attendance.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ASISTIO' }) }),
      );
      expect(result.status).toBe('ASISTIO');
    });

    it('lanza NotFoundException si el QR no existe', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      await expect(service.verify(dto, 'v-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el QR pertenece a otro evento', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({ ...baseAttendance, eventId: 'otro-evento' });
      await expect(service.verify(dto, 'v-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si el QR ya fue verificado', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue({ ...baseAttendance, status: 'ASISTIO' });
      await expect(service.verify(dto, 'v-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyAttendances', () => {
    it('retorna las asistencias del usuario con datos del evento', async () => {
      const fakeAttendances = [
        { id: 'att-1', qrCode: 'qr-1', status: 'CONFIRMADO', tipoAsistencia: 'PRESENCIAL', confirmedAt: new Date(), verifiedAt: null, event: { id: 'ev-1', titulo: 'Evento A', fechaHora: new Date(), ubicacionPresencial: 'Sala 1', linkVirtual: null } },
        { id: 'att-2', qrCode: 'qr-2', status: 'ASISTIO', tipoAsistencia: 'VIRTUAL', confirmedAt: new Date(), verifiedAt: new Date(), event: { id: 'ev-2', titulo: 'Evento B', fechaHora: new Date(), ubicacionPresencial: null, linkVirtual: 'https://meet.example.com' } },
      ];
      mockPrisma.attendance.findMany.mockResolvedValue(fakeAttendances);

      const result = await service.getMyAttendances('user-1');

      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('retorna array vacío si el usuario no tiene asistencias', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      const result = await service.getMyAttendances('user-sin-asistencias');
      expect(result).toEqual([]);
    });
  });

  describe('getByEvent', () => {
    it('lanza ForbiddenException si el PONENTE no tiene ponencia en el evento', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue(null);
      await expect(service.getByEvent('ev-1', ['PONENTE'], 'ponente-1')).rejects.toThrow(ForbiddenException);
    });

    it('el ADMIN puede ver asistencias sin verificar ponencia', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      const result = await service.getByEvent('ev-1', ['ADMIN'], 'admin-1');
      expect(mockPrisma.ponencia.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
