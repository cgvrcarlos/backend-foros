import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

export const Roles = (...roles: string[]) => {
  const decorator = (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata('roles', roles, descriptor ? descriptor.value : target);
    return descriptor || target;
  };
  return decorator;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }

    const allowed = requiredRoles.some((r) => (user.roles as Role[]).includes(r as Role));
    if (!allowed) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
