import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

const getCurrentUserByContext = (context: ExecutionContext): any => {
  const request = context.switchToHttp().getRequest<Request>();
  return request.user;
};

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): any =>
    getCurrentUserByContext(context),
);
