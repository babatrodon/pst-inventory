-- CreateEnum
CREATE TYPE "MoveType" AS ENUM ('IN', 'OUT', 'ADJ_IN', 'ADJ_OUT');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "codeNorm" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "brand" TEXT NOT NULL DEFAULT 'Other',
    "category" TEXT NOT NULL DEFAULT 'Uncategorized',
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "listPrice" DECIMAL(14,4),
    "discountPct" DECIMAL(7,3),
    "minStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "openingQty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "stockCached" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "MoveType" NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "party" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company" TEXT NOT NULL DEFAULT 'Power Source Trading Est.',
    "phone" TEXT NOT NULL DEFAULT '+966 506 299 482 - +966 566 114 323',
    "email" TEXT NOT NULL DEFAULT 'anstrade@yahoo.com',
    "address" TEXT NOT NULL DEFAULT 'Riyadh, Saudi Arabia',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "openLabel" TEXT NOT NULL DEFAULT 'Opening stock (June 2024)',
    "defMin" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "item_codeNorm_idx" ON "item"("codeNorm");

-- CreateIndex
CREATE INDEX "item_brand_idx" ON "item"("brand");

-- CreateIndex
CREATE INDEX "item_category_idx" ON "item"("category");

-- CreateIndex
CREATE INDEX "item_stockCached_idx" ON "item"("stockCached");

-- CreateIndex
CREATE INDEX "movement_itemId_date_idx" ON "movement"("itemId", "date");

-- CreateIndex
CREATE INDEX "movement_date_idx" ON "movement"("date");

-- CreateIndex
CREATE INDEX "movement_type_idx" ON "movement"("type");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement" ADD CONSTRAINT "movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement" ADD CONSTRAINT "movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "item_code_trgm" ON "item" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "item_name_trgm" ON "item" USING GIN ("name" gin_trgm_ops);
