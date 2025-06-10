import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaClient, User } from '@prisma/client';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './token.payload.interface';

type UserWithRoles = User & {
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{
        permission: {
          name: string;
        };
      }>;
    };
  }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
  ) {}

  async login(user: User, response: Response) {
    console.log(user, 'user in auth service');
    const jwtExpirationString =
      this.configService.getOrThrow<string>('JWT_EXPIRATION');
    const jwtRefreshExpirationString = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRATION',
    );

    const expMilliseconds = this.parseExpirationToMs(jwtExpirationString);
    const expires = new Date(Date.now() + expMilliseconds);

    const userWithRoles = (await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as UserWithRoles | null;

    if (!userWithRoles) {
      throw new UnauthorizedException('User not found');
    }

    const roles: string[] = userWithRoles.roles.map((r) => r.role.name);
    const permissions: string[] = userWithRoles.roles.flatMap((r) =>
      r.role.permissions.map((p) => p.permission.name),
    );

    const tokenPayload: TokenPayload = {
      userId: user.id,
      roles,
      permissions,
    };

    console.log(tokenPayload, 'token payload in auth service');

    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_ACCESS'),
      expiresIn: jwtExpirationString,
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_REFRESH'),
      expiresIn: jwtRefreshExpirationString,
    });

    response.cookie('Authentication', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });

    response.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { tokenPayload };
  }

  async refresh(user: User, response: Response) {
    const jwtExpirationString =
      this.configService.getOrThrow<string>('JWT_EXPIRATION');
    const jwtRefreshExpirationString = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRATION',
    );

    const expMilliseconds = this.parseExpirationToMs(jwtExpirationString);
    const expires = new Date(Date.now() + expMilliseconds);

    const userWithRoles = (await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as UserWithRoles | null;

    if (!userWithRoles) {
      throw new UnauthorizedException('User not found');
    }

    const roles: string[] = userWithRoles.roles.map((r) => r.role.name);
    const permissions: string[] = userWithRoles.roles.flatMap((r) =>
      r.role.permissions.map((p) => p.permission.name),
    );

    const tokenPayload: TokenPayload = {
      userId: user.id,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_ACCESS'),
      expiresIn: jwtExpirationString,
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_REFRESH'),
      expiresIn: jwtRefreshExpirationString,
    });

    response.cookie('Authentication', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });

    response.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
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
      console.log(user);
      const authenticated = await bcrypt.compare(password, user.password);
      if (!authenticated) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (err) {
      throw new UnauthorizedException('Credentials are not valid.');
    }
  }

  verifyToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token);
  }
}
