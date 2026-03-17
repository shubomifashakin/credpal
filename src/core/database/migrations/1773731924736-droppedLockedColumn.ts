import { MigrationInterface, QueryRunner } from "typeorm";

export class DroppedLockedColumn1773731924736 implements MigrationInterface {
    name = 'DroppedLockedColumn1773731924736'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_balances" DROP COLUMN "locked_balance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_balances" ADD "locked_balance" numeric(20,8) NOT NULL DEFAULT '0'`);
    }

}
