import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Get, Param, Patch, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { OcrService } from './ocr.service';
import { Bill } from './entities/bill.entity';

@ApiTags('OCR')
@Controller('ocr')
@UseGuards(AuthGuard()) // Melindungi semua endpoint di controller ini
@ApiBearerAuth() // Menandakan di Swagger bahwa butuh token
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    @Get('/my-bills')
    @ApiOperation({ summary: 'Mengambil riwayat semua struk milik pengguna' })
    @ApiResponse({ status: 200, description: 'Berhasil mengambil data riwayat.', type: [Bill] })
    @ApiResponse({ status: 401, description: 'Tidak terautentikasi.' })
    getBillsForUser(@GetUser() user: User): Promise<Bill[]> {
        return this.ocrService.getBillsForUser(user);
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Mengambil detail satu struk berdasarkan ID' })
    getBillById(@Param('id') id: string, @GetUser() user: User) {
        return this.ocrService.getBillById(id, user.id);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Unggah dan proses gambar struk' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Struk berhasil diproses dan disimpan.' })
    @ApiResponse({ status: 401, description: 'Tidak terautentikasi (token tidak valid).' })
    uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @GetUser() user: User, // Mengambil data user yang sedang login
    ) {
        return this.ocrService.processAndSaveBill(file.buffer, user);
    }

    @Patch('/split/:id')
    @ApiOperation({ summary: 'Menyimpan hasil pembagian tagihan untuk sebuah struk' })
    saveSplitDetails(
        @Param('id') id: string,
        @Body() splitDetails: any,
        @GetUser() user: User,
    ) {
        return this.ocrService.saveSplitDetails(id, splitDetails, user.id);
    }
}