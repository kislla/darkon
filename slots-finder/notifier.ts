import { UserAppointment } from './appointment-setter';
import { Twilio } from 'twilio';
import { getLogger, LoggerMessages, withRequest } from './src/services/logger';
import { SmsNotifierService } from './src/services/sms-notifier';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const SHILOS_PHONE = process.env.SHILOS_PHONE;
export const notifyAppointmentSet = async (event: any, context: any) => {
  const smsNotifierService = new SmsNotifierService(new Twilio(twilioAccountSid!, twilioAuthToken!));
  withRequest(event, context);
  const logger = getLogger();

  const userAppointment = JSON.parse(event.Records[0].body) as UserAppointment;
  const phoneToSend = userAppointment.phone.replace('0', '+972');
  const phonesToNotify: string[] = [SHILOS_PHONE!, phoneToSend];

  const content = `היי ${userAppointment.firstName}, קבענו לך תור לעיר ${userAppointment.city} בסניף ${userAppointment.branchName} בכתובת ${userAppointment.address} בתאריך ${userAppointment.date} בשעה ${userAppointment.hour}\n
  עזרו לנו להמשיך לפתח ולתחזק את גםכןבוט ופרגנו לנו בקפה 🤙 \n
  https://bit.ly/3KHsUiB 
  `;
  const publishPromises = phonesToNotify.map(phone => smsNotifierService.send(phone, content));
  const responses = await Promise.allSettled(publishPromises);
  logger.info({ responses }, LoggerMessages.SMSPublishResult);
};

