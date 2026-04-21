export interface EventInfoDto {
  id: string;
  titulo: string;
  fechaHora: Date;
}

export interface VerifiedTimelineBucket {
  hour: string; // "HH:00"
  count: number;
}

export interface EventStatsResponse {
  evento: EventInfoDto | null;
  totalConfirmados: number;
  confirmadosPresenciales: number;
  confirmadosVirtuales: number;
  asistioCount: number;
  noAsistioCount: number;
  confirmadoPendiente: number;
  tasaAsistencia: number; // 0..1
  totalRespuestas: number;
  verifiedTimeline: VerifiedTimelineBucket[];
}
