export type UserType = 'student' | 'admin' | 'super_admin';

export interface User {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  universityId?: number;
  userType: UserType;
}

export interface University {
  universityId: number;
  name: string;
  location: string;
  description?: string;
  emailDomain: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  universityId?: number;
  userType: UserType;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export type EventType = 'public' | 'private' | 'rso';

export interface Event {
  eventId: number;
  name: string;
  category: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationId: number;
  email: string;
  phoneNumber: string;
  createdBy: number;
  eventType: EventType;
  universityId?: number;
  rsoId?: number;
  approved: boolean;
  location?: Location;
}

export interface Location {
  locationId: number;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
}

export interface CreateEventData {
  name: string;
  category: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  longitude: number;
  latitude: number;
  email: string;
  phoneNumber: string;
  eventType: EventType;
  universityId?: number;
  rsoId?: number;
}

export interface RSO {
  rsoId: number;
  name: string;
  description: string;
  universityId: number;
  adminId: number;
  status: 'active' | 'inactive';
  isMember?: boolean;
  memberCount?: number;
}

export interface Comment {
  commentId: number;
  eventId: number;
  userId: number;
  commentText: string;
  rating?: number;
  firstName: string;
  lastName: string;
}

export interface CreateCommentData {
  commentText: string;
  rating?: number;
}