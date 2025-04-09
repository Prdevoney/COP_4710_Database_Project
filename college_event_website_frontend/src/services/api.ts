import axios from 'axios';
import { LoginFormData, RegisterFormData, User, University, Event, RSO, CreateEventData, Comment, CreateCommentData } from '../types';

const API_URL = 'http://localhost:5000/api';

// Configure axios to include credentials for session cookies
axios.defaults.withCredentials = true;

// Auth Services
export const registerUser = async (userData: RegisterFormData): Promise<User> => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data.user;
};

export const loginUser = async (credentials: LoginFormData): Promise<User> => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data.user;
};

export const logoutUser = async (): Promise<void> => {
  await axios.post(`${API_URL}/logout`);
};

export const checkSession = async (): Promise<{ isAuthenticated: boolean; user?: User }> => {
  const response = await axios.get(`${API_URL}/session`);
  return response.data;
};

// University Services
export const getUniversities = async (): Promise<University[]> => {
  const response = await axios.get(`${API_URL}/universities`);
  // Convert snake_case to camelCase for consistent interface
  return response.data.map((uni: any) => ({
    universityId: uni.university_id,
    name: uni.name,
    location: uni.location,
    description: uni.description,
    emailDomain: uni.email_domain
  }));
};

export interface CreateUniversityData {
  name: string;
  location: string;
  description?: string;
  emailDomain: string;
}

export const createUniversity = async (universityData: CreateUniversityData): Promise<University> => {
  const response = await axios.post(`${API_URL}/universities`, universityData);
  return response.data.university;
};

// Event Services
export const getEvents = async (): Promise<Event[]> => {
  const response = await axios.get(`${API_URL}/events`);
  return response.data.map((event: any) => ({
    eventId: event.event_id,
    name: event.name,
    category: event.category,
    description: event.description,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    locationId: event.location_id,
    email: event.email,
    phoneNumber: event.phone_number,
    universityId: event.university_id,
    rsoId: event.rso_id,
    eventType: event.event_type,
    createdBy: event.created_by,
    approved: event.approved,
    location: event.location ? {
      locationId: event.location.location_id,
      name: event.location.name,
      address: event.location.address,
      longitude: event.location.longitude,
      latitude: event.location.latitude
    } : undefined
  }));
};

export const createEvent = async (eventData: CreateEventData): Promise<Event> => {
  const response = await axios.post(`${API_URL}/events`, eventData);
  return response.data.event;
};

// Function to approve a pending public event (super_admin only)
export const approveEvent = async (eventId: number): Promise<Event> => {
  const response = await axios.put(`${API_URL}/events/${eventId}/approve`);
  return response.data.event;
};

// Function to get events pending approval (super_admin only)
export const getPendingEvents = async (): Promise<Event[]> => {
  const response = await axios.get(`${API_URL}/events/pending-approval`);
  console.log('Raw pending events data:', response.data);
  return response.data.map((event: any) => ({
    eventId: event.event_id,
    name: event.name,
    category: event.category,
    description: event.description,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    locationId: event.location_id,
    email: event.email,
    phoneNumber: event.phone_number,
    universityId: event.university_id,
    rsoId: event.rso_id,
    eventType: event.event_type,
    createdBy: event.created_by,
    approved: event.approved,
    location: {
      locationId: event.location_id,
      name: event.location_name || (event.location ? event.location.name : ''),
      address: event.address || (event.location ? event.location.address : ''),
      longitude: event.longitude || (event.location ? event.location.longitude : 0),
      latitude: event.latitude || (event.location ? event.location.latitude : 0)
    }
  }));
};

// Comment Services
export const getEventComments = async (eventId: number): Promise<Comment[]> => {
  const response = await axios.get(`${API_URL}/events/${eventId}/comments`);
  return response.data.map((comment: any) => ({
    commentId: comment.comment_id,
    eventId: comment.event_id,
    userId: comment.user_id,
    commentText: comment.comment_text,
    rating: comment.rating,
    firstName: comment.first_name,
    lastName: comment.last_name
  }));
};

export const addComment = async (eventId: number, commentData: CreateCommentData): Promise<Comment> => {
  const response = await axios.post(`${API_URL}/events/${eventId}/comments`, commentData);
  const comment = response.data.comment;
  
  return {
    commentId: comment.comment_id,
    eventId: comment.event_id,
    userId: comment.user_id,
    commentText: comment.comment_text,
    rating: comment.rating,
    firstName: comment.first_name,
    lastName: comment.last_name
  };
};

export const updateComment = async (commentId: number, commentData: CreateCommentData): Promise<Comment> => {
  const response = await axios.put(`${API_URL}/comments/${commentId}`, commentData);
  const comment = response.data.comment;
  
  return {
    commentId: comment.comment_id,
    eventId: comment.event_id,
    userId: comment.user_id,
    commentText: comment.comment_text,
    rating: comment.rating,
    firstName: comment.first_name,
    lastName: comment.last_name
  };
};

export const deleteComment = async (commentId: number): Promise<void> => {
  await axios.delete(`${API_URL}/comments/${commentId}`);
};

// RSO Services
export const getRSOs = async (): Promise<RSO[]> => {
  const response = await axios.get(`${API_URL}/rsos`);
  return response.data.map((rso: any) => ({
    rsoId: rso.rso_id,
    name: rso.name,
    description: rso.description,
    universityId: rso.university_id,
    adminId: rso.admin_id,
    status: rso.status,
    isMember: rso.is_member,
    memberCount: rso.member_count
  }));
};

export interface CreateRSOData {
  name: string;
  description: string;
}

export const createRSO = async (rsoData: CreateRSOData): Promise<RSO> => {
  const response = await axios.post(`${API_URL}/rsos`, rsoData);
  return response.data.rso;
};

export const joinRSO = async (rsoId: number): Promise<RSO> => {
  const response = await axios.post(`${API_URL}/rsos/${rsoId}/join`);
  return response.data.rso;
};

export const leaveRSO = async (rsoId: number): Promise<RSO> => {
  const response = await axios.post(`${API_URL}/rsos/${rsoId}/leave`);
  return response.data.rso;
};