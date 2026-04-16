import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PonentesService } from './ponentes.service';
import { CreatePonenteDto } from './dto/create-ponente.dto';
import { UpdatePonenteDto } from './dto/update-ponente.dto';
import { CreatePonenciaDto } from './dto/create-ponencia.dto';
import { UpdatePonenciaDto } from './dto/update-ponencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PonentesController {
  constructor(private readonly ponentesService: PonentesService) {}

  // ─── Ponentes (ADMIN) ───────────────────────────────────────────────────────

  @Get('ponentes')
  @Roles('ADMIN')
  findAll() {
    return this.ponentesService.findAll();
  }

  @Get('ponentes/mis-ponencias')
  @Roles('PONENTE', 'ADMIN')
  getMisPonencias(@Request() req: any) {
    return this.ponentesService.getMisPonencias(req.user.sub as string);
  }

  @Get('ponentes/:id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.ponentesService.findOne(id);
  }

  @Post('ponentes')
  @Roles('ADMIN')
  create(@Body() dto: CreatePonenteDto) {
    return this.ponentesService.create(dto);
  }

  @Put('ponentes/:id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePonenteDto) {
    return this.ponentesService.update(id, dto);
  }

  @Delete('ponentes/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.ponentesService.remove(id);
  }

  // ─── Ponencias (ADMIN) ──────────────────────────────────────────────────────

  @Get('eventos/:eventoId/ponencias')
  @Roles('ADMIN')
  getPonenciasByEvent(@Param('eventoId') eventoId: string) {
    return this.ponentesService.getPonenciasByEvent(eventoId);
  }

  @Post('eventos/:eventoId/ponencias')
  @Roles('ADMIN')
  createPonencia(
    @Param('eventoId') eventoId: string,
    @Body() dto: CreatePonenciaDto,
  ) {
    return this.ponentesService.createPonencia(eventoId, dto);
  }

  @Put('ponencias/:id')
  @Roles('ADMIN')
  updatePonencia(
    @Param('id') id: string,
    @Body() dto: UpdatePonenciaDto,
  ) {
    return this.ponentesService.updatePonencia(id, dto);
  }

  @Delete('ponencias/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePonencia(@Param('id') id: string) {
    return this.ponentesService.removePonencia(id);
  }
}
