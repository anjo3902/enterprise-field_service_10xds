export class MapsClient {
  constructor(private apiKey: string) {}

  async getDistance(origin: string, destination: string) {
    // Stub implementation
    return { distance: 0, duration: 0 };
  }
}
