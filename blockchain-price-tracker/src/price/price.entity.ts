import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity("price")
export class price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    chain: string;

    @Column('decimal')
    price: number;

    @CreateDateColumn()
    createdat: Date;
}
