import { SlotsFinder } from './src/services/slots-finder';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { HttpService, SessionCreator } from './src/services';

const MAX_DAYS = 7;

export async function findSlots(_event: any, _context: any): Promise<void> {
  const token = await SessionCreator.create();
  const httpService = new HttpService(token);
  const slotsFinder = new SlotsFinder(httpService);
  const sqsClient = new SQSClient({ region: 'eu-central-1' });
  const queueUrl = process.env.SLOTS_QUEUE_URL;
  const slots = await slotsFinder.find(MAX_DAYS);
  console.log(`Found ${slots.length} in the session`)
  const publishes = slots.map(slot =>
    sqsClient.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(slot)
    })));

  await Promise.all(publishes);
};

