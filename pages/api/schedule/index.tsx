import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from "next-auth/next";
import { ObjectId } from 'mongodb';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized - Please sign in' });
    }

    const userEmail = session.user.email;

    if (req.method === 'GET') {
      const schedules = await db
        .collection('schedules')
        .find({ email: userEmail })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(schedules);
    }

    if (req.method === 'POST') {
      const { courseCode, descriptiveTitle, units, days, time, room, instructor } = req.body;

      if (!courseCode || !descriptiveTitle || !units || !days || !time || !room || !instructor) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const newSchedule = {
        _id: new ObjectId(),
        courseCode,
        descriptiveTitle,
        units,
        days,
        time,
        room,
        instructor,
        email: userEmail,
        createdAt: new Date()
      };
      
      await db.collection('schedules').insertOne(newSchedule);
      return res.status(201).json(newSchedule);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
