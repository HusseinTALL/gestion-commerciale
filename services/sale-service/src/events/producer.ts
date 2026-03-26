import { Kafka, Producer, Partitioners } from 'kafkajs';

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = new Kafka({
    clientId: 'sale-service',
    brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092').split(','),
  });

  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });

  await producer.connect();
  console.log('[sale-service] Kafka producer connected');
  return producer;
}

export async function publishSaleCreated(payload: SaleCreatedEvent): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: 'sale.created',
    messages: [
      {
        key: payload.saleId,
        value: JSON.stringify(payload),
      },
    ],
  });
}

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
