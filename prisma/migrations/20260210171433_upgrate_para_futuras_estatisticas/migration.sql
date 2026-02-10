-- CreateTable
CREATE TABLE "Contato" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "start_date_conversation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_date_conversation" TIMESTAMP(3),
    "objetivoLead" TEXT,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contato_phone_key" ON "Contato"("phone");
