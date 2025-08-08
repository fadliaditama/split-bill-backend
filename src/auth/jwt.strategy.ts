import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {
        super({
            secretOrKey: 'super-secret-key-change-it', // Ganti dengan secret key Anda!
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(payload: { id: string; email: string }): Promise<User> {
        const { id } = payload;
        const user = await this.usersRepository.findOneBy({ id });

        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}