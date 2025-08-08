import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth') // Mengelompokkan API di Swagger
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('/register')
    @ApiOperation({ summary: 'Mendaftarkan pengguna baru' })
    @ApiResponse({ status: 201, description: 'Pengguna berhasil dibuat.' })
    @ApiResponse({ status: 409, description: 'Email sudah terdaftar.' })
    signUp(@Body() createUserDto: CreateUserDto): Promise<void> {
        return this.authService.signUp(createUserDto);
    }

    @Post('/login')
    @ApiOperation({ summary: 'Login pengguna' })
    @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan token JWT.' })
    @ApiResponse({ status: 401, description: 'Email atau password salah.' })
    signIn(@Body() loginDto: LoginDto): Promise<{ accessToken: string }> {
        return this.authService.signIn(loginDto);
    }
}