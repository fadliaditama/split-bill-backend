import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Bill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: true }) // Kolom untuk nama toko
    storeName: string;

    @Column({ type: 'text', nullable: true }) // Kolom untuk lokasi
    storeLocation: string;

    @Column({ type: 'date', nullable: true }) // Kolom untuk tanggal belanja
    purchaseDate: Date;

    // Menyimpan daftar barang dalam format JSON
    @Column({ type: 'jsonb', default: [] })
    items: any[];

    @Column()
    total: number;

    @Column({ type: 'text' })
    rawText: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'text', nullable: true })
    imageUrl: string;

    // Menandakan satu Bill dimiliki oleh satu User
    @ManyToOne(() => User, (user) => user.bills)
    @JoinColumn({ name: 'userId' }) // Ini akan membuat kolom 'userId' di tabel
    user: User;
}