import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.query;

  const client = await clientPromise;
  const db = client.db();

  const schedules = await db.collection("schedules").find({ email }).toArray();

  res.status(200).json(schedules);
}
