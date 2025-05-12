import { ObjectId } from 'mongodb';

export interface DuplicateQuery {
  $or: Array<{
    courseCode?: string;
    descriptiveTitle?: string;
  }>;
  _id?: {
    $ne: ObjectId;
  };
} 