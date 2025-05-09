import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { courseCode, descriptiveTitle, excludeId } = req.body;
    const client = await clientPromise;
    const db = client.db();

    // Build query to check for duplicates
    const query: any = {
      $or: [
        { courseCode: courseCode },
        { descriptiveTitle: descriptiveTitle }
      ]
    };

    // If excludeId is provided (for edit case), exclude that document from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingSchedule = await db.collection('schedules').findOne(query);

    if (existingSchedule) {
      // Determine which field is duplicate
      const field = existingSchedule.courseCode === courseCode ? 'Course Code' : 'Descriptive Title';
      return res.status(200).json({ isDuplicate: true, field });
    }

    return res.status(200).json({ isDuplicate: false });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return res.status(500).json({ error: 'Failed to check for duplicates' });
  }
} 