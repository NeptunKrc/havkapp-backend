import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Custom parameter decorator to extract the current authenticated user from the request.
 *
 * @example
 * // Get the entire user payload
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return { userId: user.sub, clubId: user.clubId };
 * }
 *
 * @example
 * // Get a specific property
 * @Get('my-club')
 * getMyClub(@CurrentUser('clubId') clubId: string) {
 *   return { clubId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
