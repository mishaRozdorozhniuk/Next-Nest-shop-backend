import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const getCurrentUserByContext = (context: ExecutionContext): any => {
  return context.switchToHttp().getRequest().user;
};

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): any =>
    getCurrentUserByContext(context),
);
