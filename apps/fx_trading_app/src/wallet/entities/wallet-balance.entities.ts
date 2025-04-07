import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entities';

@Entity()
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, wallet => wallet.balances)
  wallet: Wallet;

  @Column()
  currency: string;

  @Column({ type: 'decimal', default: 0 })
  amount: number;
}
