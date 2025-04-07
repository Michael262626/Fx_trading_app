import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
import { TransactionStatus, TransactionType } from '../enum/TransactionStatus.enum';
import { Wallet } from 'apps/fx_trading_app/src/wallet/entities/wallet.entities';
import { User } from '../../users/user.entities';
  
  @Entity()
  export class Transaction extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => Wallet, wallet => wallet.transactions, { eager: true })
    wallet: Wallet;
  
    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;
  
    @Column({ type: 'enum', enum: TransactionStatus })
    status: TransactionStatus;

    @ManyToOne(() => User, user => user.transactions)
    user: User;
  
    @Column({ type: 'varchar' })
    currency: string;
  
    @Column('decimal', { precision: 18, scale: 6 })
    amount: number;
  
    @Column({ nullable: true, type: 'decimal', precision: 18, scale: 6 })
    rate?: number;
  
    @Column({ nullable: true })
    description?: string;
  
    @CreateDateColumn()
    createdAt: Date;
  }
  