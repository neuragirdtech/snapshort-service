import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'snapcut_secret_key_123', // Sama dengan di AuthModule
    });
  }

  async validate(payload: any) {
    // Kembalikan userId agar bisa diakses lewat req.user
    return { userId: payload.sub, email: payload.email };
  }
}
