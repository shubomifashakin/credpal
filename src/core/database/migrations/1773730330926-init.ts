import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773730330926 implements MigrationInterface {
    name = 'Init1773730330926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "code" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('FUNDING', 'CONVERSION', 'TRADE')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING', "from_currency" character varying(3), "to_currency" character varying(3) NOT NULL, "from_amount" numeric(20,8), "to_amount" numeric(20,8) NOT NULL, "rate" numeric(20,8), "reference" character varying NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dd85cc865e0c3d5d4be095d3f3f" UNIQUE ("reference"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "currency" character varying(3) NOT NULL, "balance" numeric(20,8) NOT NULL DEFAULT '0', "locked_balance" numeric(20,8) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "wallet_id_currency_unique" UNIQUE ("wallet_id", "currency"), CONSTRAINT "PK_eebe2c6f13f1a2de3457f8a885c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_92558c08091598f7a4439586cd" UNIQUE ("user_id"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "otps" ADD CONSTRAINT "FK_3938bb24b38ad395af30230bded" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_balances" ADD CONSTRAINT "FK_df71d0f9058318ebc25302aa365" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`);
        await queryRunner.query(`ALTER TABLE "wallet_balances" DROP CONSTRAINT "FK_df71d0f9058318ebc25302aa365"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`);
        await queryRunner.query(`ALTER TABLE "otps" DROP CONSTRAINT "FK_3938bb24b38ad395af30230bded"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
        await queryRunner.query(`DROP TABLE "wallet_balances"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "otps"`);
    }

}
