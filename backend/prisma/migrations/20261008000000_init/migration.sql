
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Home" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Minha Casa',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT 'São Paulo',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "securityArmed" BOOLEAN NOT NULL DEFAULT false,
    "tariff" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "haUrl" TEXT,
    "haToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roomId" TEXT,
    "on" BOOLEAN NOT NULL DEFAULT false,
    "brightness" INTEGER NOT NULL DEFAULT 70,
    "lightMode" TEXT NOT NULL DEFAULT 'warm',
    "temp" INTEGER NOT NULL DEFAULT 24,
    "acMode" TEXT NOT NULL DEFAULT 'Frio',
    "fanSpeed" TEXT NOT NULL DEFAULT 'Média',
    "swing" TEXT NOT NULL DEFAULT 'Auto',
    "powerW" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "haEntityId" TEXT,
    "onSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "wh" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "EnergyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Casa',
    "icon" TEXT NOT NULL DEFAULT 'moon',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerTime" TEXT,
    "triggerDays" TEXT NOT NULL DEFAULT '0123456',
    "triggerDeviceId" TEXT,
    "triggerState" TEXT,
    "triggerTemp" DOUBLE PRECISION,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "lastRunAt" TIMESTAMP(3),
    "lastRunKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "name" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'info',
    "deviceId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "EnergyLog_day_idx" ON "EnergyLog"("day");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyLog_deviceId_day_key" ON "EnergyLog"("deviceId", "day");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

