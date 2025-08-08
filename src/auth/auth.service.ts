import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async signUp(createUserDto: CreateUserDto): Promise<void> {
        const { email, password } = createUserDto;

        const user = this.usersRepository.create({ email, password });

        try {
            await this.usersRepository.save(user);
        } catch (error) {
            if (error.code === '23505') { // 23505 adalah kode error duplicate di PostgreSQL
                throw new ConflictException('Email sudah terdaftar');
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async signIn(loginDto: LoginDto): Promise<{ accessToken: string }> {
        const { email, password } = loginDto;
        const user = await this.usersRepository.findOneBy({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const payload = { id: user.id, email: user.email };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        } else {
            throw new UnauthorizedException('Email atau password salah');
        }
    }
}