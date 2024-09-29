-- CreateEnum
CREATE TYPE "MeasureType" AS ENUM ('WATER', 'GAS');

-- CreateTable
CREATE TABLE "leituraResposta" (
    "measure_uuid" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "measure_datetime" TIMESTAMP(3) NOT NULL,
    "measure_type" "MeasureType" NOT NULL,
    "imageURL" TEXT NOT NULL,
    "confirmed_value" INTEGER NOT NULL,

    CONSTRAINT "leituraResposta_pkey" PRIMARY KEY ("measure_uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "leituraResposta_customer_code_key" ON "leituraResposta"("customer_code");
