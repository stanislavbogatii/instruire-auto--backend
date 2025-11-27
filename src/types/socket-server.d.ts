import "socket.io";

declare module "socket.io" {
  interface Socket {
    user?: {
      sub: number;
      email: string;
      role: string;
      name?: string;
    };
  }
}
