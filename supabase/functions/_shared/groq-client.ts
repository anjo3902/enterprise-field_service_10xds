export class GroqClient {
  constructor(private apiKey: string) {}

  async generateText(prompt: string) {
    // Stub implementation
    return { success: true, text: "stub" };
  }
}
