import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const client = await clientPromise;
      const db = client.db();
      
      const updateData = req.body;
      delete updateData._id;
      
      const result = await db.collection('schedules').findOneAndUpdate(
        { _id: new ObjectId(id as string) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.json(result);
    } catch (error) {
      console.error('Error updating schedule:', error);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const client = await clientPromise;
      const db = client.db();
      const result = await db.collection('schedules').deleteOne({
        _id: new ObjectId(id as string),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
