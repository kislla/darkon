import { HttpService } from './http';
import {
  aFailedResponse,
  aSuccessResponse,
  PrepareVisitResponse,
  ResponseStatus,
  User,
  UserVisitResponse
} from '../internal-types';
import { AnswerQuestionRequest, PrepareVisitData } from '../api';
import { Answers, QuestionResolver } from './question-resolver/question-resolver';
import { ErrorCode } from '../consts';
import { LoggerMessages } from './logger';
import { BaseLogger } from 'pino';

export class VisitPreparer {

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: BaseLogger) {
  }

  private buildAnswerRequestFrame(question: PrepareVisitData): Omit<AnswerQuestionRequest, 'AnswerIds' | 'AnswerText'> {
    return {
      PreparedVisitToken: question.PreparedVisitToken,
      QuestionId: question.QuestionnaireItem.QuestionId,
      QuestionnaireItemId: question.QuestionnaireItem.QuestionnaireItemId

    };
  }

  private extractDataByAnswer(answer: Answers, user: User): string {
    switch (answer) {
      case Answers.Id:
        return user.id;
      case Answers.PhoneNumber:
        return user.phone;
    }
    return '';
  }

  private async answer(question: PrepareVisitData, user: User): Promise<PrepareVisitResponse> {
    if (QuestionResolver.isDone(question)) {
      this.logger.info({}, LoggerMessages.VisitPrepareDoneQuestions);
      return aSuccessResponse(question);
    }

    if (QuestionResolver.hasErrors(question)) {
      this.logger.info({ question }, LoggerMessages.VisitPrepareError);
      return aFailedResponse(QuestionResolver.hasErrors(question) as ErrorCode);
    }

    const whatToAnswer = QuestionResolver.resolveAnswer(question);
    const request: AnswerQuestionRequest = {
      ...this.buildAnswerRequestFrame(question),
      ...(whatToAnswer === Answers.VisitType ? {
          AnswerIds: [77],
          AnswerText: null
        } :
        {
          AnswerIds: null,
          AnswerText: this.extractDataByAnswer(whatToAnswer, user)
        })
    };
    const nextQuestion = await this.httpService.answer(request);
    this.logger.info({ question: nextQuestion }, LoggerMessages.VisitPrepareNextMessage);
    return this.answer(nextQuestion, user);
  }

  async prepare(user: User, serviceId: number): Promise<UserVisitResponse> {
    const initialQuestion = await this.httpService.prepareVisit(serviceId);
    this.logger.info({ question: initialQuestion }, LoggerMessages.VisitPrepareInitialQuestion);
    const response = await this.answer(initialQuestion, user);
    return response.status === ResponseStatus.Success ?
      aSuccessResponse({
          user,
          visitId: response.data.PreparedVisitId,
          visitToken: response.data.PreparedVisitToken
        }
      ) :
      aFailedResponse(response.data.errorCode);

  }
}
