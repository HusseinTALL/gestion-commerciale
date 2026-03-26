import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { calculateCommissionsForSale } from '../services/commission-calculator';

let consumer: Consumer | null = null;

export interface SaleCreatedEvent {
  saleId: string;
  saleCode: string;
  saleDate: string;
  salespersonId: string;
  buyerPhone: string;
  totalGross: number;
  totalCollected: number;
  totalDiscount: number;
  status: string;
  lines: Array<{
    id: string;
    productVariantId: string;
    productCategory: string;
    thickness: number;
    unitLength: number;
    quantity: number;
    totalMetrage: number;
    actualOutput: number;
    unitPrice: number;
    grossAmount: number;
    discount: number;
    netAmount: number;
  }>;
}

export async function startConsumer(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'commission-service',
    brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092').split(','),
    retry: { retries: 10, initialRetryTime: 3000 },
  });

  consumer = kafka.consumer({ groupId: 'commission-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'sale.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;
      try {
        const event: SaleCreatedEvent = JSON.parse(message.value.toString());
        console.log(`[commission-service] Processing sale.created: ${event.saleCode}`);
        await calculateCommissionsForSale(event);
      } catch (err) {
        console.error('[commission-service] Error processing event:', err);
      }
    },
  });

  console.log('[commission-service] Kafka consumer started — listening on sale.created');
}
