import { HttpService } from './http';
import {
  aFailedResponse,
  aSuccessResponse,
  EnrichedSlot,
  SetAppointmentResponse,
  UserVisitSuccessData
} from '../internal-types';
import { AppointmentSetRequest, AppointmentSetResponse } from '../api';
import { ErrorCode, MockPosition } from '../consts';

enum ErrorStrings {
  DoubleBook = 'לא ניתן לתאם תור חדש לפני ביטול התור הקיים'
}

export class AppointmentHandler {
  constructor(private readonly httpService: HttpService) {
  }

  private static resolveError(response: AppointmentSetResponse): ErrorCode {
    if (response.ErrorMessage === 'General server error') {
      return ErrorCode.SetAppointmentGeneralError;
    } else if (Array.isArray(response.Messages)) {
      const errorStr = response.Messages.join('');
      if (errorStr.includes(ErrorStrings.DoubleBook)) {
        return ErrorCode.AlreadyHadAnAppointment;
      } else {
        return ErrorCode.General;
      }
    }
    return ErrorCode.General;
  }

  async setAppointment(userVisit: UserVisitSuccessData, slot: EnrichedSlot): Promise<SetAppointmentResponse> {
    const { serviceId, date, timeSinceMidnight } = slot;
    const { visitId, visitToken } = userVisit;
    const setAppointmentRequest: AppointmentSetRequest = {
      ServiceId: serviceId,
      appointmentDate: date,
      appointmentTime: timeSinceMidnight,
      position: MockPosition,
      preparedVisitId: visitId
    };

    const response = await this.httpService.setAppointment(visitToken, setAppointmentRequest);
    return response?.Success ?
      aSuccessResponse(response.Results!) :
      aFailedResponse(AppointmentHandler.resolveError(response!));
  }

}
