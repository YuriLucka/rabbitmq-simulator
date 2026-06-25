export class Message {
  constructor(
    public readonly payload: string,
    public readonly routingKey: string,
  ) {}
}
