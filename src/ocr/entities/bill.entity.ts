import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Bill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Menyimpan daftar barang dalam format JSON
    @Column({ type: 'jsonb', default: [] })
    items: any[];

    @Column()
    total: number;

    @Column({ type: 'text' })
    rawText: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    // Menandakan satu Bill dimiliki oleh satu User
    @ManyToOne(() => User, (user) => user.bills)
    @JoinColumn({ name: 'userId' }) // Ini akan membuat kolom 'userId' di tabel
    user: User;
}