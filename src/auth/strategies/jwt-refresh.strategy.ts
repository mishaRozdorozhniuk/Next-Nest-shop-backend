import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private userService: UsersService,
    configService: ConfigService,
  ) {
    const jwtRefreshSecret = configService.get<string>('JWT_REFRESH');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH secret is not defined in configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.Refresh || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtRefreshSecret,
    });
  }

  async validate(payload: { userId: number; exp: number }) {
    const authUser = await this.userService.getUser({ id: payload.userId });

    return authUser;
  }
}
