import { MigrationInterface, QueryRunner } from "typeorm";

export class Indexes1773779461036 implements MigrationInterface {
    name = 'Indexes1773779461036'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_user_code" ON "otps" ("user_id", "code") `);
        await queryRunner.query(`CREATE INDEX "idx_wallet_id" ON "transactions" ("wallet_id") `);
        await queryRunner.query(`CREATE INDEX "idx_user" ON "transactions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_user_id" ON "wallets" ("user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_wallet_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_code"`);
    }

}
