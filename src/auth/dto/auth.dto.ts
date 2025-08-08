import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email pengguna' })
    email: string;

    @ApiProperty({ example: 'S3cr3tP@ssw0rd', description: 'Password pengguna' })
    password: string;
}

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email pengguna' })
    email: string;

    @ApiProperty({ example: 'S3cr3tP@ssw0rd', description: 'Password pengguna' })
    password: string;
}