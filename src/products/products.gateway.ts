import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ProductsGateway {
  constructor(private readonly authService: AuthService) {}

  @WebSocketServer()
  private readonly server: Server;

  handleProductUpdated() {
    this.server.emit('productUpdated');
  }

  handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as {
        Authentication?: { value?: string };
      };
      const token = auth?.Authentication?.value;

      if (!token) {
        console.log('No token provided for client:', client.id);
        client.disconnect(true);
        return false;
      }

      this.authService.verifyToken(token);
      console.log('Client authenticated and connected:', client.id);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.log('Authentication failed for client:', client.id, errorMessage);
      client.disconnect(true);
      return false;
    }
  }
}
