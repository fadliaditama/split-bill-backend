import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Get, Param, Patch, Body, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { OcrService } from './ocr.service';
import { Bill } from './entities/bill.entity';

class SaveSplitDto {
    @ApiProperty()
    splitDetails: any;

    @ApiProperty()
    total: number;
}

@ApiTags('OCR')
@Controller('ocr')
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    @Post('/upload')
    @UseGuards(AuthGuard())
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Menerima struk untuk diproses di latar belakang' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    async initiateUpload(@UploadedFile() file: Express.Multer.File, @GetUser() user: User) {
        const bill = await this.ocrService.initiateBillProcessing(file.buffer, user);
        // Jalankan proses berat di latar belakang tanpa menunggu (fire-and-forget)
        this.ocrService.processQueuedBill(bill.id);
        return { message: 'Struk diterima dan sedang diproses.', bill };
    }

    @Get('/my-bills')
    @UseGuards(AuthGuard())
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mengambil riwayat semua struk milik pengguna' })
    getBillsForUser(@GetUser() user: User): Promise<Bill[]> {
        return this.ocrService.getBillsForUser(user);
    }

    @Get('/:id')
    @UseGuards(AuthGuard())
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mengambil detail satu struk berdasarkan ID' })
    getBillById(@Param('id') id: string, @GetUser() user: User) {
        return this.ocrService.getBillById(id, user.id);
    }

    @Patch('/split/:id')
    @UseGuards(AuthGuard())
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Menyimpan hasil pembagian tagihan untuk sebuah struk' })
    saveSplitDetails(
        @Param('id') id: string,
        @Body() saveSplitDto: SaveSplitDto,
        @GetUser() user: User,
    ) {
        return this.ocrService.saveSplitDetails(id, saveSplitDto, user.id);
    }

    @Delete('/:id')
    @UseGuards(AuthGuard())
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Menghapus satu struk berdasarkan ID' })
    deleteBill(@Param('id') id: string, @GetUser() user: User) {
        return this.ocrService.deleteBill(id, user.id);
    }
}