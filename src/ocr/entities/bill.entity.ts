import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

// EXPORT enum ini agar bisa diakses dari file lain
export enum BillStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  storeName: string;

  @Column({ type: 'text', nullable: true })
  storeLocation: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ type: 'jsonb', default: [] })
  items: any[];

  @Column({type: 'float', default: 0})
  total: number;

  @Column({ type: 'text', nullable: true })
  rawText: string;
  
  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  splitDetails: any;

  @Column({
    type: 'enum',
    enum: BillStatus,
    default: BillStatus.PROCESSING,
  })
  status: BillStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.bills)
  @JoinColumn({ name: 'userId' })
  user: User;
}