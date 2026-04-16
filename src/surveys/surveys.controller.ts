import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Public()
  @Get('eventos/:eventoId/survey')
  getByEvent(@Param('eventoId') eventoId: string) {
    return this.surveysService.getByEvent(eventoId);
  }

  @Roles('ADMIN')
  @Post('eventos/:eventoId/survey')
  createForEvent(
    @Param('eventoId') eventoId: string,
    @Body() dto: CreateSurveyDto,
  ) {
    return this.surveysService.createForEvent(eventoId, dto);
  }

  @Roles('ADMIN')
  @Put('eventos/:eventoId/survey')
  updateForEvent(
    @Param('eventoId') eventoId: string,
    @Body() dto: CreateSurveyDto,
  ) {
    return this.surveysService.updateForEvent(eventoId, dto);
  }

  @Roles('ADMIN')
  @Post('surveys/:surveyId/questions')
  addQuestion(
    @Param('surveyId') surveyId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.surveysService.addQuestion(surveyId, dto);
  }

  @Roles('ADMIN')
  @Put('questions/:questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.surveysService.updateQuestion(questionId, dto);
  }

  @Roles('ADMIN')
  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeQuestion(@Param('questionId') questionId: string) {
    return this.surveysService.removeQuestion(questionId);
  }

  @Roles('ADMIN', 'PONENTE')
  @Get('surveys/:surveyId/responses')
  getResponses(
    @Param('surveyId') surveyId: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.surveysService.getResponses(
      surveyId,
      req.user.role,
      req.user.sub,
    );
  }
}
