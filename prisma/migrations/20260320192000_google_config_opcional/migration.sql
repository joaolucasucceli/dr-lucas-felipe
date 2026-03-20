-- AlterTable
ALTER TABLE "config_google_calendar" ALTER COLUMN "refreshToken" DROP NOT NULL,
ALTER COLUMN "calendarId" DROP NOT NULL;
