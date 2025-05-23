import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { program, year, semester, academicYear } = req.body;
  if (!program || !year || !semester || !academicYear) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const client = await clientPromise;
  const db = client.db();
  await db.collection('users').updateOne(
    { email: session.user.email },
    { $set: { program, year, semester, academicYear } }
  );
  res.status(200).json({ ok: true });
} 