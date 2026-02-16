import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../src/shared/enums/user-role.enum';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Admin credentials
  const adminEmail = 'admin@videoconf.com';
  const adminPassword = 'Admin@123456';
  const adminDisplayName = 'System Administrator';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists');
    console.log(`📧 Email: ${adminEmail}`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      displayName: adminDisplayName,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    ', adminEmail);
  console.log('🔑 Password: ', adminPassword);
  console.log('💼 Name:     ', adminDisplayName);
  console.log('🆔 User ID:  ', admin.id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
