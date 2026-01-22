export interface DomainEvent<TPayload = unknown> {
  occurredAt: Date;

  //Event'in sistem genelinde sabit adıÖrn: ACTIVITY_CREATED

  readonly eventName: string;

  /**
   * Event'in oluştuğu an

  readonly occurredAt: Date;

  /**
   * Domain’den taşınan veri
   * (notify_target burada olacak)
   */
  readonly payload: TPayload;
}
