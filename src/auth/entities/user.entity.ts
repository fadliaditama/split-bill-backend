import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Bill } from '../../ocr/entities/bill.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    // Menandakan satu User bisa punya banyak Bill
    @OneToMany(() => Bill, (bill) => bill.user)
    bills: Bill[];

    // Ini akan otomatis mengenkripsi password sebelum disimpan
    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 10);
    }
}