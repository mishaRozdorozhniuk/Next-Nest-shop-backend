// import { Injectable, UnprocessableEntityException } from '@nestjs/common';
// import * as bcrypt from 'bcrypt';
// import { CreateUserRequest } from './dto/create-user.request';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { Prisma } from '@prisma/client';

// @Injectable()
// export class UsersService {
//   constructor(private readonly prismaService: PrismaService) {}

//   async createUser(data: CreateUserRequest) {
//     const existingUser = await this.prismaService.user.findUnique({
//       where: {
//         email: data.email,
//       },
//     });

//     // If user already exists, throw exception
//     if (existingUser) {
//       throw new UnprocessableEntityException('Email already exists');
//     }

//     // Otherwise create new user
//     return this.prismaService.user.create({
//       data: {
//         ...data,
//         password: await bcrypt.hash(data.password, 10),
//       },
//       select: {
//         email: true,
//         id: true,
//       },
//     });
//   }

//   async getUser(filter: Prisma.UserWhereUniqueInput) {
//     return this.prismaService.user.findUniqueOrThrow({
//       where: filter,
//     });
//   }
// }

import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserRequest } from './dto/create-user.request';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(data: CreateUserRequest) {
    try {
      return await this.prismaService.user.create({
        data: {
          ...data,
          password: await bcrypt.hash(data.password, 10),
        },
        select: {
          email: true,
          id: true,
        },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new UnprocessableEntityException('Email already exists.');
      }
      throw err;
    }
  }

  async getUser(filter: Prisma.UserWhereUniqueInput) {
    return this.prismaService.user.findUniqueOrThrow({
      where: filter,
    });
  }
}
