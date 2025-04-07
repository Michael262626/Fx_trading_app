import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, OneToMany, BaseEntity } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Wallet } from '../wallet/entities/wallet.entities';
import { Transaction } from '../transaction/entities/transaction.entities';

@Entity('users')
export class User extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Transaction, transaction => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Wallet, wallet => wallet.user)
  wallets: Wallet[];

  @Column({ default: false })
  isVerified: boolean;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
