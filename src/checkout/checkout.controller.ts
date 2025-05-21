import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateSessionRequest } from './dto/create-session.request';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async createSession(@Body() body: CreateSessionRequest) {
    if (!body.productId) {
      throw new Error('Product ID is required');
    }

    const productIdNumber = Number(body.productId);

    return this.checkoutService.createSession(productIdNumber);
  }

  @Post('webhook')
  async handleCheckoutWebhooks(@Body() event: any) {
    console.log(event, 'event');
    return this.checkoutService.handleCheckoutWebhook(event);
  }
}
