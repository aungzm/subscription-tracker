import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Clean up the database after all tests in a file
afterAll(async () => {
  console.log("Cleaning up database after test suite...");
  // The order is important due to foreign key constraints
  const deleteReminders = prisma.reminder.deleteMany();
  const deleteSubscriptions = prisma.subscription.deleteMany();
  const deleteCategories = prisma.category.deleteMany();
  const deletePaymentMethods = prisma.paymentMethod.deleteMany();
  const deleteNotificationProviders = prisma.notificationProvider.deleteMany();
  const deleteUsers = prisma.user.deleteMany();

  await prisma.$transaction([
    deleteReminders,
    deleteSubscriptions,
    deleteCategories,
    deletePaymentMethods,
    deleteNotificationProviders,
    deleteUsers,
  ]);

  await prisma.$disconnect();
});