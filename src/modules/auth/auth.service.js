import prisma from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function registerUser({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { name, email, password: hash },
    select: { id: true, name: true, email: true }
  });
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const senhaConfere = await bcrypt.compare(password, user.password);
  if (!senhaConfere) return null;

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email }
  };
}