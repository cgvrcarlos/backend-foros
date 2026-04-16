import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EventsCrudService } from './events-crud.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('eventos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsCrudController {
  constructor(private readonly eventsCrudService: EventsCrudService) {}

  @Public()
  @Get()
  findAll() {
    return this.eventsCrudService.findAll();
  }

  @Roles('ADMIN')
  @Get('all')
  findAllAdmin() {
    return this.eventsCrudService.findAllAdmin();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsCrudService.findOne(id);
  }

  @Roles('ADMIN')
  @Get(':id/admin')
  findOneAdmin(@Param('id') id: string) {
    return this.eventsCrudService.findOneAdmin(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsCrudService.create(dto);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsCrudService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.eventsCrudService.remove(id);
  }

  @Roles('ADMIN')
  @Patch(':id/publish')
  togglePublish(@Param('id') id: string) {
    return this.eventsCrudService.togglePublish(id);
  }
}
