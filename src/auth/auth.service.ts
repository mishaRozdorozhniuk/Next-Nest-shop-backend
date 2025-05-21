import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './token.payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  login(user: User, response: Response) {
    const jwtExpirationString =
      this.configService.getOrThrow<string>('JWT_EXPIRATION');

    const expMilliseconds = this.parseExpirationToMs(jwtExpirationString);

    const expires = new Date();
    expires.setTime(expires.getTime() + expMilliseconds);

    const tokenPayload: TokenPayload = {
      userId: user.id,
    };

    const token = this.jwtService.sign(tokenPayload);

    response.cookie('Authentication', token, {
      secure: true,
      httpOnly: true,
      expires,
    });

    return { tokenPayload };
  }

  private parseExpirationToMs(duration: string): number {
    const regex = /^(\d+)([smhdw])$/;
    const matches = duration.match(regex);

    if (!matches) {
      throw new Error(
        `Invalid duration format: ${duration}. Expected format: 10s, 5m, 2h, 1d, etc.`,
      );
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  async verifyUser(email: string, password: string) {
    try {
      const user = await this.usersService.getUser({ email });
      const authenticated = await bcrypt.compare(password, user.password);
      if (!authenticated) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (err) {
      throw new UnauthorizedException('Credentials are not valid.');
    }
  }

  verifyToken(token: string) {
    this.jwtService.verify(token);
  }
}
