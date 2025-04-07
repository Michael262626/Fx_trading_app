import { Entity, PrimaryGeneratedColumn, OneToMany, Column, ManyToOne } from 'typeorm';
import { Transaction } from '../../transaction/entities/transaction.entities';
import { User } from '../../users/user.entities';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.wallets) // Adjust the relation as necessary
  user: User;
  
  @Column({ type: 'varchar' })
  currency: string;

  @Column('jsonb', { nullable: false, default: '{}' })
  balance: Record<string, number>; 

  @OneToMany(() => Transaction, transaction => transaction.wallet) // Bidirectional relationship
  transactions: Transaction[];
}